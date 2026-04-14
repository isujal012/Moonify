import { useAtom } from 'jotai';
import { useEffect, useRef, useState, useCallback } from 'react';
import { currentSongAtom, isPlayingAtom, volumeAtom, playlistAtom } from '../../store/atoms';
import { musicService } from '../../services/musicService';
import { babeConfig } from '../../config/babeConfig';
import { usePorcupine } from '@picovoice/porcupine-react';
import { Mic, MicOff, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BabeLog { id: number; heard: string; action: string; ts: number; }
let _logId = 0;
let _restartTimer: ReturnType<typeof setTimeout> | null = null;

const getRecents = () => JSON.parse(localStorage.getItem('babe_recents') || '[]');

export function BabeAssistant() {
  const [,         setIsPlaying]         = useAtom(isPlayingAtom);
  const [,         setVolume]             = useAtom(volumeAtom);
  const [currentSong, setCurrentSong]     = useAtom(currentSongAtom);
  const [playlist,  setPlaylist]           = useAtom(playlistAtom);

  const [,            setListening]        = useState(false);
  const [awake,       setAwake]            = useState(false);
  const [transcript,  setTranscript]       = useState('');
  const [status,      setStatus]           = useState('');
  const [log,         setLog]              = useState<BabeLog[]>([]);
  const [micError,    setMicError]         = useState('');
  const [enabled,     setEnabled]          = useState(false);
  const [isWhisperRecording, setIsWhisperRecording] = useState(false);
  const [showPanel,   setShowPanel]        = useState(false); // full Siri panel
  const [audioLevel,  setAudioLevel]       = useState(0);    // 0-1

  const [] = useState<string[]>(getRecents);
  const recognitionRef  = useRef<any>(null);
  const awakeTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef      = useRef(false);
  const currentSongRef  = useRef(currentSong);
  const playlistRef     = useRef(playlist);
  const audioCtxRef     = useRef<AudioContext | null>(null);
  const analyserRef     = useRef<AnalyserNode | null>(null);
  const rafRef          = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<BlobPart[]>([]);

  // ── Picovoice Porcupine Setup ──
  const {
    keywordDetection,
    isLoaded: isPorcupineLoaded,
    error: porcupineError,
    init: initPorcupine,
    start: startPorcupine,
    stop: stopPorcupine,
  } = usePorcupine();

  useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
  useEffect(() => { playlistRef.current    = playlist;    }, [playlist]);
  useEffect(() => { enabledRef.current     = enabled;     }, [enabled]);

  // Handle Porcupine Initialization
  useEffect(() => {
    if (enabled && babeConfig.hasPicovoice && !isPorcupineLoaded && !porcupineError) {
      initPorcupine(
        babeConfig.keys.picovoice,
        { publicPath: "/babe.ppn", label: "babe" },
        { publicPath: "/porcupine_params.pv" }
      ).catch(() => console.warn('Porcupine missing models, falling back to Web Speech.'));
    }
  }, [enabled, isPorcupineLoaded, porcupineError, initPorcupine]);

  // ── Mic level analyser ─────────────────────────────────────
  const startAnalyser = useCallback(async () => {
    try {
      const stream  = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx     = new AudioContext();
      const source  = ctx.createMediaStreamSource(stream);
      const analyser= ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.slice(0, 12).reduce((a, b) => a + b, 0) / 12 / 255;
        setAudioLevel(avg);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch { /* no mic */ }
  }, []);

  const stopAnalyser = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current  = null;
    analyserRef.current  = null;
    setAudioLevel(0);
  }, []);

  // ── Helpers ────────────────────────────────────────────────
  const addLog     = useCallback((heard: string, action: string) =>
    setLog(prev => [{ id: ++_logId, heard, action, ts: Date.now() }, ...prev.slice(0, 19)]), []);
  
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.1; // Slightly higher/premium tone
    window.speechSynthesis.speak(utterance);
  }, []);

  const pushStatus = useCallback((s: string, voice?: string) => {
    setStatus(s);
    if (voice) speak(voice);
  }, [speak]);

  // ── Command Executor ───────────────────────────────────────
  const executeCommand = useCallback(async (raw: string) => {
    const cmd = raw.toLowerCase().trim();

    if (/\b(pause|stop)\b/.test(cmd)) {
      setIsPlaying(false); pushStatus('⏸ Paused', 'Paused'); addLog(raw, 'Paused'); return;
    }
    if (/^(resume|play|start|continue)$/.test(cmd)) {
      setIsPlaying(true); pushStatus('▶ Resumed', 'Playing'); addLog(raw, 'Resumed'); return;
    }
    if (/\b(next|skip)\b/.test(cmd)) {
      const pl = playlistRef.current, cs = currentSongRef.current;
      if (cs && pl.length) {
        const idx = pl.findIndex(s => s.id === cs.id);
        if (idx !== -1 && idx < pl.length - 1) {
          const nextSong = pl[idx + 1];
          setCurrentSong(nextSong); setIsPlaying(true);
          pushStatus('⏭ Next song', `Next song: ${nextSong.name}`); addLog(raw, 'Skipped to next'); return;
        }
      }
      pushStatus('Nothing to skip to', 'Nothing left in the queue'); addLog(raw, 'No next in queue'); return;
    }
    if (/\b(previous|prev|back|last)\b/.test(cmd)) {
      const pl = playlistRef.current, cs = currentSongRef.current;
      if (cs && pl.length) {
        const idx = pl.findIndex(s => s.id === cs.id);
        if (idx > 0) {
          const prevSong = pl[idx - 1];
          setCurrentSong(prevSong); setIsPlaying(true);
          pushStatus('\u23EE Previous song', `Back to ${prevSong.name}`); addLog(raw, 'Previous'); return;
        }
      }
      pushStatus('Already at start', 'You are already at the beginning'); addLog(raw, 'Already at start'); return;
    }
    if (/\b(volume|louder|quieter|mute|unmute)\b/.test(cmd)) {
      if (/\b(up|louder|increase|higher|more)\b/.test(cmd)) {
        setVolume(v => {
          const nv = parseFloat(Math.min(1, v + 0.2).toFixed(2));
          pushStatus('🔊 Volume up', `Volume up to ${Math.round(nv * 100)} percent`);
          return nv;
        });
        addLog(raw, 'Volume up'); return;
      }
      if (/\b(down|quieter|decrease|lower|less)\b/.test(cmd)) {
        setVolume(v => {
          const nv = parseFloat(Math.max(0, v - 0.2).toFixed(2));
          pushStatus('🔉 Volume down', `Volume down to ${Math.round(nv * 100)} percent`);
          return nv;
        });
        addLog(raw, 'Volume down'); return;
      }
      if (/\bunmute\b/.test(cmd) || /\b(full|max)\b/.test(cmd)) {
        setVolume(1); pushStatus('🔊 Full volume', 'Volume set to maximum'); addLog(raw, 'Max volume'); return;
      }
      if (/\bmute\b/.test(cmd)) {
        setVolume(0); pushStatus('🔇 Muted', 'Muted'); addLog(raw, 'Muted'); return;
      }
      const m = cmd.match(/\b(\d{1,3})\b/);
      if (m) {
        const pct = Math.min(100, Math.max(0, parseInt(m[1])));
        setVolume(pct / 100); pushStatus(`🔊 Volume ${pct}%`, `Volume set to ${pct} percent`); addLog(raw, `Volume ${pct}%`); return;
      }
    }
    // play <song> [by <artist>]
    const pm = cmd.match(/^(?:play|search|find|put on|can you play|could you play|song|babe play|babe can you play)\s+(.+)$/);
    if (pm) {
      let query = pm[1].trim();
      let displayQuery = query;

      // Check for "by [artist]" pattern
      const byMatch = query.match(/(.+?)\s+by\s+(.+)/i);
      if (byMatch) {
        query = `${byMatch[1]} ${byMatch[2]}`;
        displayQuery = `${byMatch[1]} by ${byMatch[2]}`;
      }

      pushStatus(`🔍 Searching "${displayQuery}"…`, `Searching for ${displayQuery}`);
      addLog(raw, `Searching "${displayQuery}"`);
      
      try {
        const results = await musicService.searchSongs(query);
        if (results.length > 0) {
          const song = results[0];
          setPlaylist(prev => prev.find(s => s.id === song.id) ? prev : [song, ...prev]);
          setCurrentSong(song); 
          setIsPlaying(true);
          pushStatus(`🎵 Playing "${song.name}"`, `Playing ${song.name}`);
          addLog(raw, `Playing "${song.name}"`);
        } else { 
          pushStatus(`😕 No results for "${displayQuery}"`, `I couldn't find ${displayQuery}`);
          addLog(raw, 'No results'); 
        }
      } catch { 
        pushStatus('❌ Search failed', 'Sorry, I encountered an error searching for that.');
        addLog(raw, 'Search error'); 
      }
      return;
    }
    pushStatus('❓ Didn\'t get that'); addLog(raw, 'Unknown command');
  }, [setIsPlaying, setCurrentSong, setPlaylist, setVolume, addLog, pushStatus]);

  // ── OpenAI Whisper Integration ──
  const startWhisperRecording = useCallback(async () => {
    try {
      pushStatus('Listening…');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsWhisperRecording(false);
        pushStatus('Processing…');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'command.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        try {
          const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${babeConfig.keys.openai}` },
            body: formData
          });
          const data = await res.json();
          if (data.text) {
             setTranscript(data.text);
             executeCommand(data.text);
          } else if (data.error) {
             pushStatus('❌ AI Error', 'Sorry, my AI brain had an error.');
             console.error('Whisper Error:', data.error);
          }
        } catch (e) {
          pushStatus('❌ Network error', 'I could not connect to my brain.');
        }
        
        // Resume continuous listening if applicable
        if (babeConfig.hasPicovoice && isPorcupineLoaded) {
           startPorcupine();
        } else {
           startRecognition();
        }
      };

      mediaRecorder.start();
      setIsWhisperRecording(true);

      // Stop recording after 4 seconds of command input
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
        stream.getTracks().forEach(t => t.stop());
      }, 4000);

    } catch (e) {
      setMicError('Microphone access denied for AI.');
      setIsWhisperRecording(false);
    }
  }, [executeCommand, pushStatus, isPorcupineLoaded, startPorcupine]);

  // Handle Porcupine Wake Word Detection
  useEffect(() => {
    if (keywordDetection?.label === 'babe') {
      setAwake(true);
      setShowPanel(true);
      if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
      awakeTimerRef.current = setTimeout(() => setAwake(false), 5000);
      
      if (babeConfig.hasOpenAI) {
        stopPorcupine(); // Pause wake-word engine during Whisper recording
        startWhisperRecording();
      } else {
        // If no Whisper, rely on the continuous Web Speech API that's already running
        pushStatus('Listening…');
      }
    }
  }, [keywordDetection, startWhisperRecording, stopPorcupine]);

  // ── Web Speech Recognition (Fallback & Continuous) ──────────────────
  const stopRecognition = useCallback(() => {
    if (_restartTimer) { clearTimeout(_restartTimer); _restartTimer = null; }
    if (recognitionRef.current) {
      recognitionRef.current._stopping = true;
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    if (babeConfig.hasPicovoice && isPorcupineLoaded) {
      stopPorcupine();
    }
    setListening(false);
  }, [isPorcupineLoaded, stopPorcupine]);

  const startRecognition = useCallback(() => {
    // If we have Porcupine, we don't need Web Speech for continuous listening
    // unless we don't have Whisper (in which case we need both).
    if (babeConfig.hasPicovoice && isPorcupineLoaded && babeConfig.hasOpenAI) {
       startPorcupine();
       setListening(true);
       setMicError('');
       return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || recognitionRef.current) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true;
    rec.lang = 'en-IN'; rec._stopping = false;

    rec.onstart = () => { setListening(true); setMicError(''); };
    rec.onend   = () => {
      recognitionRef.current = null; setListening(false);
      // Don't auto-restart if we are currently recording via Whisper
      if (!rec._stopping && enabledRef.current && !isWhisperRecording)
        _restartTimer = setTimeout(startRecognition, 500);
    };
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        if (!babeConfig.hasPicovoice) {
          setMicError('Microphone permission denied.');
          setEnabled(false); enabledRef.current = false; rec._stopping = true;
        }
      }
    };
    rec.onresult = (e: any) => {
      // Ignore web speech results if Whisper is handling the command
      if (isWhisperRecording || (babeConfig.hasPicovoice && babeConfig.hasOpenAI)) return;

      let interim = '', final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (interim += t);
      }
      const full = (final || interim).toLowerCase().trim();
      setTranscript(full);
      const idx = full.indexOf('babe');
      if (idx !== -1) {
        const after = full.slice(idx + 4).trim().replace(/^[,.\s]+/, '');
        if (after.length > 0 && final) {
          setAwake(true); setShowPanel(true);
          if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
          awakeTimerRef.current = setTimeout(() => setAwake(false), 5000);
          executeCommand(after);
        } else {
          setAwake(true); setShowPanel(true);
          pushStatus('Listening…');
          if (awakeTimerRef.current) clearTimeout(awakeTimerRef.current);
          awakeTimerRef.current = setTimeout(() => { setAwake(false); setStatus(''); }, 5000);
        }
      }
    };
    try { rec.start(); recognitionRef.current = rec; } catch {}
  }, [executeCommand, pushStatus, isPorcupineLoaded, startPorcupine, isWhisperRecording]);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false); enabledRef.current = false;
      stopRecognition(); stopAnalyser();
      setShowPanel(false); setStatus(''); setTranscript('');
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setEnabled(true); enabledRef.current = true; setMicError('');
        startRecognition(); startAnalyser();
      } catch { setMicError('Allow microphone access to use Babe'); }
    }
  }, [enabled, startRecognition, stopRecognition, startAnalyser, stopAnalyser]);

  useEffect(() => () => { enabledRef.current = false; stopRecognition(); stopAnalyser(); }, [stopRecognition, stopAnalyser]);
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(''), 5000);
    return () => clearTimeout(t);
  }, [status]);

  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return null;

  // Orb scale reacts to mic level
  const orbScale = 1 + audioLevel * 0.45;
  const waveHeight = (i: number) => {
    const base = [0.3, 0.6, 1, 0.8, 0.5, 0.9, 0.4, 0.7, 0.5, 0.35, 0.75, 0.6, 0.45, 0.85, 0.5];
    return awake ? (base[i % base.length] * 0.5 + audioLevel * 0.5) : 0.15;
  };

  return (
    <>
      {/* ── Floating pill when panel closed ── */}
      <AnimatePresence>
        {!showPanel && (
          <motion.button
            className={`babe-pill ${enabled ? 'babe-pill-on' : ''}`}
            onClick={enabled ? () => setShowPanel(true) : toggle}
            title={enabled ? 'Open Babe' : 'Enable Babe voice assistant'}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            whileTap={{ scale: 0.93 }}
          >
            {enabled ? (
              <>
                <span className="babe-pill-orb" />
                <span className="babe-pill-label">Babe</span>
              </>
            ) : (
              <>
                <MicOff size={14} />
                <span className="babe-pill-label">Babe</span>
              </>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Siri Panel ── */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            className="siri-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="siri-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
            >
              {/* Drag handle */}
              <button className="siri-close" onClick={() => setShowPanel(false)}>
                <ChevronDown size={22} />
              </button>

              {/* ── Animated Orb ── */}
              <div className="siri-orb-wrap">
                <motion.div
                  className={`siri-orb ${awake ? 'orb-awake' : ''}`}
                  animate={{ scale: orbScale }}
                  transition={{ type: 'spring', stiffness: 200, damping: 18 }}
                >
                  <div className="orb-blob b1" />
                  <div className="orb-blob b2" />
                  <div className="orb-blob b3" />
                  <div className="orb-blob b4" />
                  <div className="orb-shimmer" />
                </motion.div>

                {/* Waveform bars when awake */}
                <div className={`siri-wave-wrap ${awake ? 'wave-show' : ''}`}>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <motion.span
                      key={i}
                      className="siri-bar"
                      animate={{ scaleY: waveHeight(i) }}
                      transition={{ duration: 0.15, delay: i * 0.02 }}
                      style={{ animationDelay: `${i * 0.07}s` }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Text area ── */}
              <div className="siri-text-area">
                {/* Transcript */}
                <AnimatePresence mode="wait">
                  {transcript ? (
                    <motion.p
                      key={transcript}
                      className="siri-transcript"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      {transcript}
                    </motion.p>
                  ) : (
                    <motion.p
                      key="idle"
                      className="siri-hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {enabled
                        ? awake ? 'Processing…' : 'Say "babe play …" or "babe volume up"'
                        : 'Tap the mic to enable'}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Status response */}
                <AnimatePresence>
                  {status && (
                    <motion.p
                      className="siri-status"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {status}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Error */}
                {micError && <p className="siri-error">{micError}</p>}
              </div>

              {/* ── Bottom controls ── */}
              <div className="siri-controls">
                {/* Recent commands */}
                {log.length > 0 && (
                  <div className="siri-log">
                    {log.slice(0, 3).map(l => (
                      <div key={l.id} className="siri-log-chip">
                        <span className="slc-heard">"{l.heard}"</span>
                        <span className="slc-action">{l.action}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mic button */}
                <motion.button
                  className={`siri-mic-btn ${enabled ? 'mic-on' : 'mic-off'} ${awake ? 'mic-awake' : ''}`}
                  onClick={toggle}
                  whileTap={{ scale: 0.88 }}
                  title={enabled ? 'Tap to disable Babe' : 'Tap to enable Babe'}
                >
                  {awake && <span className="mic-ring r1" />}
                  {awake && <span className="mic-ring r2" />}
                  {enabled ? <Mic size={26} /> : <MicOff size={26} />}
                </motion.button>
                <p className="siri-mic-label">
                  {enabled ? (awake ? 'Listening…' : 'Ready') : 'Tap to start'}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* ── Floating pill ── */
        .babe-pill {
          position: fixed;
          bottom: 110px; right: 24px;
          z-index: 280;
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px;
          border-radius: 30px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(16, 10, 28, 0.82);
          color: rgba(255,255,255,0.45);
          font-size: 0.82rem; font-weight: 600;
          cursor: pointer;
          backdrop-filter: blur(16px);
          box-shadow: 0 4px 22px rgba(0,0,0,0.4);
          transition: all 0.2s;
        }
        @media (max-width: 768px) {
          .babe-pill {
          bottom: 165px !important;
          right: 20px !important;
          padding: 10px 16px;
          border-radius: 20px;
          background: rgba(15, 15, 25, 0.8) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.08);
          z-index: 6000 !important; /* Above everything */
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          }
        }
        .babe-pill.babe-pill-on {
          border-color: rgba(192,132,252,0.35);
          color: #c084fc;
          box-shadow: 0 4px 26px rgba(124,58,237,0.3);
        }
        .babe-pill-orb {
          width: 10px; height: 10px; border-radius: 50%;
          background: linear-gradient(135deg,#a855f7,#38bdf8);
          box-shadow: 0 0 8px rgba(168,85,247,0.8);
          animation: pillOrb 2s ease-in-out infinite;
        }
        @keyframes pillOrb { 0%,100%{opacity:0.7;} 50%{opacity:1;box-shadow:0 0 16px rgba(168,85,247,1);} }
        .babe-pill-label { letter-spacing: 0.04em; }

        /* ── Backdrop ── */
        .siri-backdrop {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(4px);
          display: flex; align-items: flex-end; justify-content: center;
        }

        /* ── Panel ── */
        .siri-panel {
          width: 100%; max-width: 480px;
          height: 72vh;
          background: linear-gradient(180deg, rgba(8,4,18,0.98) 0%, rgba(12,6,24,0.99) 100%);
          border-radius: 32px 32px 0 0;
          border-top: 1px solid rgba(255,255,255,0.07);
          box-shadow: 0 -20px 80px rgba(0,0,0,0.7);
          display: flex; flex-direction: column;
          align-items: center;
          padding: 0 24px 36px;
          overflow: hidden;
          position: relative;
        }

        /* close */
        .siri-close {
          width: 100%; display: flex; justify-content: center; align-items: center;
          background: none; border: none; color: rgba(255,255,255,0.25);
          cursor: pointer; padding: 14px 0 0;
          transition: color 0.2s;
        }
        .siri-close::before {
          content:''; position:absolute; top:10px;
          width:36px; height:4px; border-radius:2px;
          background: rgba(255,255,255,0.15);
        }
        .siri-close:hover { color: rgba(255,255,255,0.7); }

        /* ── Orb ── */
        .siri-orb-wrap {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 28px;
          width: 100%;
        }
        .siri-orb {
          width: 160px; height: 160px;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          box-shadow: 0 0 60px rgba(168,85,247,0.15);
          background: rgba(8,4,18,1);
        }
        .siri-orb.orb-awake {
          box-shadow: 0 0 80px rgba(168,85,247,0.4),
                      0 0 120px rgba(56,189,248,0.15);
        }
        .orb-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(22px);
          opacity: 0.85;
        }
        .b1 {
          width: 120px; height: 120px;
          top: -20px; left: -20px;
          background: radial-gradient(circle, #a855f7, #7c3aed);
          animation: blobMove1 4s ease-in-out infinite;
        }
        .b2 {
          width: 100px; height: 100px;
          bottom: -15px; right: -15px;
          background: radial-gradient(circle, #38bdf8, #0284c7);
          animation: blobMove2 5s ease-in-out infinite;
        }
        .b3 {
          width: 90px; height: 90px;
          top: 40%; left: 30%;
          background: radial-gradient(circle, #ec4899, #be185d);
          opacity: 0.6;
          animation: blobMove3 3.5s ease-in-out infinite;
        }
        .b4 {
          width: 70px; height: 70px;
          bottom: 20%; left: -10%;
          background: radial-gradient(circle, #34d399, #059669);
          opacity: 0.45;
          animation: blobMove4 6s ease-in-out infinite;
        }
        .orb-shimmer {
          position: absolute; inset: 0;
          background: radial-gradient(circle at 35% 30%, rgba(255,255,255,0.12), transparent 60%);
          border-radius: 50%;
        }
        @keyframes blobMove1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,20px) scale(1.1); }
          66%      { transform: translate(10px,-15px) scale(0.95); }
        }
        @keyframes blobMove2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-25px,-18px) scale(1.15); }
          70%      { transform: translate(-10px,10px) scale(0.9); }
        }
        @keyframes blobMove3 {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.6; }
          50%      { transform: translate(-20px,12px) scale(1.2); opacity:0.9; }
        }
        @keyframes blobMove4 {
          0%,100% { transform: translate(0,0); opacity:0.45; }
          60%      { transform: translate(25px,-10px); opacity:0.7; }
        }

        /* ── Waveform ── */
        .siri-wave-wrap {
          display: flex; align-items: center; gap: 4px;
          height: 44px;
          opacity: 0;
          transform: scaleY(0.4);
          transition: opacity 0.3s, transform 0.3s;
        }
        .siri-wave-wrap.wave-show { opacity: 1; transform: scaleY(1); }
        .siri-bar {
          display: block;
          width: 4px; border-radius: 3px;
          background: linear-gradient(to top, #7c3aed, #38bdf8);
          height: 36px;
          transform-origin: bottom;
          animation: barBounce 1s ease-in-out infinite;
        }
        .siri-bar:nth-child(odd)  { animation-duration: 0.8s; }
        .siri-bar:nth-child(3n)   { animation-duration: 1.2s; background: linear-gradient(to top,#ec4899,#a855f7); }
        .siri-bar:nth-child(5n)   { animation-duration: 0.9s; background: linear-gradient(to top,#38bdf8,#34d399); }
        @keyframes barBounce {
          0%,100% { transform: scaleY(0.2); }
          50%      { transform: scaleY(1); }
        }

        /* ── Text ── */
        .siri-text-area {
          width: 100%; text-align: center;
          min-height: 72px;
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          padding: 0 12px;
        }
        .siri-transcript {
          font-size: 1.05rem; color: white; font-weight: 500;
          margin: 0; line-height: 1.4;
        }
        .siri-hint {
          font-size: 0.88rem; color: rgba(255,255,255,0.3);
          margin: 0;
        }
        .siri-status {
          font-size: 0.92rem; font-weight: 600;
          color: #c084fc; margin: 0;
          animation: fadeSlideIn 0.25s ease;
        }
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(6px);} to{opacity:1;transform:translateY(0);} }
        .siri-error {
          font-size: 0.78rem; color: #fca5a5; margin: 0;
        }

        /* ── Controls ── */
        .siri-controls {
          width: 100%;
          display: flex; flex-direction: column;
          align-items: center; gap: 16px;
          padding-top: 8px;
        }

        /* recent log */
        .siri-log {
          display: flex; flex-direction: column; gap: 5px;
          width: 100%; padding: 0 4px;
        }
        .siri-log-chip {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          padding: 6px 12px;
        }
        .slc-heard  { font-size:0.78rem; color:#c084fc; font-style:italic; }
        .slc-action { font-size:0.75rem; color:rgba(255,255,255,0.4); }

        /* mic button */
        .siri-mic-btn {
          width: 70px; height: 70px; border-radius: 50%;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          position: relative;
          transition: all 0.25s;
        }
        .siri-mic-btn.mic-off {
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.4);
          box-shadow: none;
        }
        .siri-mic-btn.mic-on {
          background: linear-gradient(135deg,#1e1040,#3b1380);
          color: #c084fc;
          box-shadow: 0 0 30px rgba(124,58,237,0.35);
          border: 1px solid rgba(192,132,252,0.3);
        }
        .siri-mic-btn.mic-awake {
          background: linear-gradient(135deg,#7c3aed,#a855f7);
          color: white;
          box-shadow: 0 0 50px rgba(168,85,247,0.7);
        }
        .mic-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid rgba(192,132,252,0.5);
          animation: micRing 1.6s ease-out infinite;
          pointer-events: none;
        }
        .mic-ring.r2 { animation-delay: 0.65s; }
        @keyframes micRing {
          0%   { transform:scale(1); opacity:0.7; }
          100% { transform:scale(2); opacity:0; }
        }
        .siri-mic-label {
          font-size: 0.72rem; color: rgba(255,255,255,0.3);
          letter-spacing: 0.04em; margin:0;
        }
      `}</style>
    </>
  );
}
