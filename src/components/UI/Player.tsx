import { useEffect, useRef, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Maximize2, ListPlus } from 'lucide-react';
import { currentSongAtom, isPlayingAtom, volumeAtom, isSearchOpenAtom, isDashboardOpenAtom, currentTimeAtom, lyricsAtom, playlistAtom, localLikedSongsAtom, localPlaylistsAtom, userAiProfileAtom } from '../../store/atoms';
import { musicService, type Song } from '../../services/musicService';
import { aiService } from '../../services/aiService';
import { audioAnalyserAtom, initAnalyser } from '../../store/audioStore';

export function Player() {
  const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
  const [isPlaying, setIsPlaying] = useAtom(isPlayingAtom);
  const [volume, setVolume] = useAtom(volumeAtom);
  const [, setIsSearchOpen] = useAtom(isSearchOpenAtom);
  const [isDashOpen, setIsDashOpen] = useAtom(isDashboardOpenAtom);
  const [, setAnalyser] = useAtom(audioAnalyserAtom);
  const [currentTime, setCurrentTime] = useAtom(currentTimeAtom);
  const [, setLyrics] = useAtom(lyricsAtom);
  const [playlist, setPlaylist] = useAtom(playlistAtom);
  const [likedSongs, setLikedSongs] = useAtom(localLikedSongsAtom);
  const [userPlaylists, setPlaylists] = useAtom(localPlaylistsAtom);
  const [, setAiProfile] = useAtom(userAiProfileAtom);
  const [showPlaylistPicker, setShowPlaylistPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const isLiked = currentSong && Array.isArray(likedSongs)
    ? likedSongs.some(s => s.originalId === (currentSong?.originalId || currentSong?.id) || s.id === currentSong?.id)
    : false;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);
  const lastSpacePress = useRef<number>(0);
  const isInitialLoad = useRef(true);
  const playThresholdLogged = useRef<string | null>(null);
  const songStartedAt = useRef<number>(0);

  const playNext = useCallback(async () => {
    if (!currentSong) return;
    const idx = playlist.findIndex(s => s.id === currentSong.id || (s.originalId && s.originalId === currentSong.id));
    if (idx !== -1 && idx < playlist.length - 1) {
      logSkip(currentSong);
      setCurrentSong(playlist[idx + 1]);
    } else {
      // Fallback if playlist is completely dry for some reason
      try {
        const recs = await aiService.getRecommendationsForUser([currentSong]);
        if (recs && recs.length > 0) {
          const nextSong = recs[Math.floor(Math.random() * recs.length)];
          setPlaylist(prev => [...prev, nextSong]);
          setCurrentSong(nextSong);
        } else {
          setIsPlaying(false);
        }
      } catch (err) {
        console.error("AI Autoplay Error:", err);
        setIsPlaying(false);
      }
    }
  }, [currentSong, playlist, setCurrentSong, setIsPlaying]);

  const playPrev = useCallback(() => {
    if (!currentSong) return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const idx = playlist.findIndex(s => s.id === currentSong.id || (s.originalId && s.originalId === currentSong.id));
    if (idx > 0) {
      logSkip(currentSong);
      setCurrentSong(playlist[idx - 1]);
    }
  }, [currentSong, playlist, setCurrentSong]);

  useEffect(() => {
    if (currentSong) {
      const url = currentSong.downloadUrl?.[currentSong.downloadUrl.length - 1]?.link;
      if (url) {
        if (!audioRef.current) {
          audioRef.current = new Audio(url);
          audioRef.current.crossOrigin = "anonymous";
          const analyserNode = initAnalyser(audioRef.current);
          setAnalyser(analyserNode);
          
          if (isInitialLoad.current && currentTime > 0) {
            audioRef.current.currentTime = currentTime;
          }
        } else if (audioRef.current.src !== url) {
          audioRef.current.src = url;
          if (!isInitialLoad.current) {
            setCurrentTime(0);
          } else if (currentTime > 0) {
            audioRef.current.currentTime = currentTime;
          }
        }
        
        isInitialLoad.current = false;
        audioRef.current.loop = false; // Ensure AI recommendation autoplay is active instead of looping
        audioRef.current.volume = volume;
        if (isPlaying) audioRef.current.play();

        // Fetch Lyrics
        setLyrics(null);
        musicService.getSyncedLyrics(currentSong).then(setLyrics);

        // Auto-populate queue with AI recs if queue is getting short
        const idx = playlist.findIndex(s => s.id === currentSong.id || (s.originalId && s.originalId === currentSong.id));
        if (idx === -1 || idx >= playlist.length - 3) {
          aiService.getRecommendationsForUser([currentSong]).then((recs: Song[]) => {
            if (recs && recs.length > 0) {
              setPlaylist(prev => {
                const newPlaylist = [...prev];

                // Extract base IDs to prevent immediately spamming the exact same underlying song sequentially
                const recentIds = newPlaylist.slice(-5).map(p => p.originalId || p.id);

                recs.forEach((r: Song) => {
                  const baseId = r.originalId || r.id;
                  // Don't inject exactly what was just played, but allow it if it played a while ago
                  if (!recentIds.includes(baseId)) {
                    // Essential: Add a UUID to the ID so `findIndex` correctly steps forward when tracks repeat.
                    const uniqueSong = { ...r, originalId: baseId, id: `${baseId}_${Math.random().toString(36).substring(2, 9)}` };
                    newPlaylist.push(uniqueSong);
                    recentIds.push(baseId); // Update local recents to prevent dual dupes
                  }
                });
                return newPlaylist;
              });
            }
          });
        }
      }
    }
    
    // Track when a new song starts for skip analysis
    if (currentSong) {
      songStartedAt.current = Date.now();
      playThresholdLogged.current = null;
    }
  }, [currentSong]);

  // AI Interaction Logging Effect
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const checkMilestones = () => {
      if (playThresholdLogged.current === currentSong.id || !audio.duration) return;

      const progressRatio = audio.currentTime / audio.duration;
      
      // Full Play Milestone (80%)
      if (progressRatio > 0.8) {
        setAiProfile(prev => aiService.logInteraction(currentSong, 'FULL_PLAY', prev));
        playThresholdLogged.current = currentSong.id;
      }
    };

    audio.addEventListener('timeupdate', checkMilestones);
    return () => audio.removeEventListener('timeupdate', checkMilestones);
  }, [currentSong, setAiProfile]);

  // Handle Skip/Like Logging
  const logSkip = useCallback((song: Song | null) => {
    if (!song) return;
    const durationPlayed = (Date.now() - songStartedAt.current) / 1000;
    
    if (durationPlayed < 15 && playThresholdLogged.current !== song.id) {
      setAiProfile(prev => aiService.logInteraction(song, 'SKIP', prev));
    } else if (durationPlayed > 30 && playThresholdLogged.current !== song.id) {
      setAiProfile(prev => aiService.logInteraction(song, 'PARTIAL_PLAY', prev));
    }
  }, [setAiProfile]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Playback failed", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => playNext();

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSong, setCurrentTime, playNext]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in the search bar
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const audio = audioRef.current;

      if (e.key === ' ' || e.code === 'Space') {
        const now = Date.now();
        if (now - lastSpacePress.current < 400) {
          setIsSearchOpen((prev) => !prev);
          setIsPlaying((p) => !p); // Revert the pause/play toggled by the first tap
        } else {
          setIsPlaying((p) => !p);
        }
        lastSpacePress.current = now;
        e.preventDefault(); // Prevent page scrolling
      } else if ((e.key === '>' || e.key === 'ArrowRight') && e.ctrlKey) {
        playNext();
        e.preventDefault();
      } else if (e.key === '>' || e.key === 'ArrowRight') {
        if (audio) audio.currentTime = Math.min(audio.currentTime + 10, audio.duration);
      } else if ((e.key === '<' || e.key === 'ArrowLeft') && e.ctrlKey) {
        playPrev();
        e.preventDefault();
      } else if (e.key === '<' || e.key === 'ArrowLeft') {
        if (audio) audio.currentTime = Math.max(audio.currentTime - 10, 0);
      } else if (e.key === '^' || e.key === 'ArrowUp') {
        setVolume((v) => Math.min(v + 0.1, 1));
        e.preventDefault(); // Prevent scrolling
      } else if (e.key === 'ArrowDown') {
        setVolume((v) => Math.max(v - 0.1, 0));
        e.preventDefault(); // Prevent scrolling
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsPlaying, setVolume, playNext, playPrev, setIsSearchOpen]);

  if (!currentSong) return null;

  return (
    <div className={`player-hud ${isDashOpen ? 'integrated' : 'floating'}`}>
      <div className="hud-progress-wrap" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (audioRef.current) audioRef.current.currentTime = percent * audioRef.current.duration;
      }}>
        <div className="hud-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="hud-content">
        <div className="song-section">
          <div className="art-thumb">
            <img src={currentSong.image?.[0]?.link} alt="" />
          </div>
          <div className="metadata">
            <h3>{currentSong.name}</h3>
            <p>{currentSong.primaryArtists}</p>
          </div>
          <button
            className="hud-icon favorite"
            title={isLiked ? "Remove from Favorites" : "Save to Favorites"}
            onClick={() => {
              if (isLiked) {
                setLikedSongs(prev => prev.filter(s => s.originalId !== (currentSong.originalId || currentSong.id) && s.id !== currentSong.id));
              } else {
                setLikedSongs(prev => [...prev, currentSong]);
              }
            }}
          >
            <Heart size={18} fill={isLiked ? "#FF4D4D" : "transparent"} color={isLiked ? "#FF4D4D" : "currentColor"} />
          </button>
          <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
              className={`hud-icon favorite ${showPlaylistPicker ? 'picker-active' : ''}`}
              title="Add to Playlist"
              onClick={() => setShowPlaylistPicker(p => !p)}
            >
              <ListPlus size={18} />
            </button>

            {showPlaylistPicker && (
              <div className="playlist-picker-popup" onClick={e => e.stopPropagation()}>
                <div className="picker-header">
                  <span>Add to playlist</span>
                  <button className="picker-close" onClick={() => setShowPlaylistPicker(false)}>✕</button>
                </div>
                <div className="picker-list">
                  {userPlaylists.length === 0 && (
                    <div className="picker-empty">No playlists yet</div>
                  )}
                  {userPlaylists.map(p => {
                    const alreadyAdded = p.songs.some(s => s.id === currentSong.id);
                    return (
                      <button
                        key={p.id}
                        className={`picker-item ${alreadyAdded ? 'added' : ''}`}
                        onClick={() => {
                          setPlaylists(prev => prev.map(pl => {
                            if (pl.id !== p.id) return pl;
                            if (alreadyAdded) {
                              return { ...pl, songs: pl.songs.filter(s => s.id !== currentSong.id) };
                            } else {
                              return { ...pl, songs: [...pl.songs, currentSong] };
                            }
                          }));
                        }}
                      >
                        <div className="picker-item-icon">{alreadyAdded ? '✓' : '+'}</div>
                        <div className="picker-item-info">
                          <span className="picker-item-name">{p.name}</span>
                          <span className="picker-item-count">{p.songs.length} songs</span>
                        </div>
                      </button>
                    );
                  })}
                  <button
                    className="picker-item picker-new"
                    onClick={() => {
                      const name = prompt('Playlist name:') || 'New Playlist';
                      setPlaylists(prev => [...prev, { id: `playlist-${Date.now()}`, name, songs: [currentSong] }]);
                      setShowPlaylistPicker(false);
                    }}
                  >
                    <div className="picker-item-icon new-icon">+</div>
                    <span className="picker-item-name">Create new playlist</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="transport-section">
          <button className="hud-icon" onClick={playPrev}><SkipBack size={22} /></button>
          <button className="hud-play" onClick={() => setIsPlaying(!isPlaying)}>
            {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
          </button>
          <button className="hud-icon" onClick={playNext}><SkipForward size={22} /></button>
        </div>

        <div className="utility-section">
          <div className="hud-volume">
            <Volume2 size={18} onClick={() => setVolume(volume > 0 ? 0 : 1)} style={{ cursor: 'pointer' }} />
            <div className="vol-track">
              <input
                type="range" min="0" max="1" step="0.01"
                value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <button className="hud-icon" onClick={() => setIsDashOpen(!isDashOpen)} title="Toggle Cosmos Fullscreen">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <style>{`
        .player-hud {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          padding: 15px 40px 30px;
          z-index: 100;
          display: flex;
          flex-direction: column;
          gap: 15px;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(30px);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .player-hud.floating {
          bottom: 25px;
          left: 50%;
          transform: translateX(-50%);
          width: 95%;
          max-width: 1200px;
          border-radius: 20px;
          padding: 15px 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .player-hud.floating, .player-hud:not(.floating) {
            bottom: 68px !important;
            left: 0;
            right: 0;
            width: 100%;
            transform: none;
            border-radius: 0;
            border-left: none;
            border-right: none;
            padding: 8px 15px;
            background: rgba(10, 10, 15, 0.98);
            border-top: 1px solid rgba(255,255,255,0.05);
            z-index: 4000 !important; /* Above Dashboard but below Global Nav (5000) */
          }
        }
        .hud-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .song-section {
          display: flex;
          align-items: center;
          gap: 15px;
          width: 30%;
        }
        .art-thumb {
          width: 50px;
          height: 50px;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .art-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .metadata h3 {
          font-size: 0.95rem;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 180px;
        }
        .metadata p {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        .favorite { margin-left: 10px; }

        .transport-section {
          display: flex;
          align-items: center;
          gap: 25px;
        }
        .hud-play {
          width: 45px;
          height: 45px;
          background: white;
          color: black;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .hud-play:hover { transform: scale(1.05); }
        .hud-icon {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .hud-icon:hover { opacity: 1; color: var(--accent-glow); }

        .utility-section {
          display: flex;
          align-items: center;
          gap: 20px;
          width: 30%;
          justify-content: flex-end;
        }
        @media (max-width: 768px) {
          .utility-section { display: none; }
          .song-section { width: 60% !important; }
          .transport-section { width: 40% !important; gap: 15px !important; justify-content: flex-end; }
          .favorite { display: none; }
        }
        .hud-volume { display: flex; align-items: center; gap: 10px; }
        .vol-track input { width: 100px; accent-color: white; }

        .hud-progress-wrap {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: rgba(255,255,255,0.1);
          cursor: pointer;
        }
        .hud-progress-bar {
          height: 100%;
          background: var(--accent-glow);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .picker-active { color: #7C3AED !important; opacity: 1 !important; }

        .playlist-picker-popup {
          position: absolute;
          bottom: calc(100% + 12px);
          left: 50%;
          transform: translateX(-50%);
          width: 230px;
          background: rgba(18, 18, 28, 0.97);
          border: 1px solid rgba(124, 58, 237, 0.4);
          border-radius: 14px;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05);
          backdrop-filter: blur(20px);
          overflow: hidden;
          z-index: 200;
          animation: pickerFadeIn 0.18s ease;
        }
        @keyframes pickerFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px 10px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }
        .picker-header span {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .picker-close {
          background: none;
          border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 2px 4px;
          transition: color 0.15s;
        }
        .picker-close:hover { color: white; }
        .picker-list { padding: 6px; max-height: 240px; overflow-y: auto; }
        .picker-empty {
          padding: 12px;
          text-align: center;
          color: rgba(255,255,255,0.3);
          font-size: 0.82rem;
        }
        .picker-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          transition: background 0.15s;
          text-align: left;
        }
        .picker-item:hover { background: rgba(255,255,255,0.08); }
        .picker-item.added { color: #7C3AED; }
        .picker-item-icon {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          background: rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          flex-shrink: 0;
          color: rgba(255,255,255,0.6);
        }
        .picker-item.added .picker-item-icon { background: rgba(124,58,237,0.25); color: #7C3AED; }
        .new-icon { background: rgba(124,58,237,0.2) !important; color: #a78bfa !important; }
        .picker-item-info { display: flex; flex-direction: column; gap: 1px; overflow: hidden; }
        .picker-item-name {
          font-size: 0.87rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .picker-item-count {
          font-size: 0.73rem;
          color: rgba(255,255,255,0.35);
        }
        .picker-item.picker-new .picker-item-name { color: #a78bfa; }
      `}</style>
    </div>
  );
}
