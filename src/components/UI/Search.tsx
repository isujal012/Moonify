import { useAtom } from 'jotai';
import { Search as SearchIcon, X, Music, Play, Clock, TrendingUp } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { isSearchOpenAtom, playlistAtom, currentSongAtom, isPlayingAtom, userAiProfileAtom } from '../../store/atoms';
import { aiService } from '../../services/aiService';
import { musicService } from '../../services/musicService';
import type { Song } from '../../services/musicService';
import { motion, AnimatePresence } from 'framer-motion';

// Recent searches stored in sessionStorage
const getRecents = (): string[] => {
  try { return JSON.parse(sessionStorage.getItem('recent_searches') || '[]'); } catch { return []; }
};
const saveRecent = (q: string) => {
  const prev = getRecents().filter(r => r !== q);
  sessionStorage.setItem('recent_searches', JSON.stringify([q, ...prev].slice(0, 6)));
};

export function Search() {
  const [isOpen, setIsOpen] = useAtom(isSearchOpenAtom);
  const [, setPlaylist] = useAtom(playlistAtom);
  const [, setCurrentSong] = useAtom(currentSongAtom);
  const [, setIsPlaying] = useAtom(isPlayingAtom);
  const [, setAiProfile] = useAtom(userAiProfileAtom);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [recents] = useState<string[]>(getRecents);
  const [hasSearched, setHasSearched] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Live suggestions (debounced 350ms) ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setSuggesting(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const songs = await musicService.searchSongs(query);
        setSuggestions(songs.slice(0, 6));
      } catch {
        setSuggestions([]);
      } finally {
        setSuggesting(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  /* ── Full search on Enter / submit ── */
  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setSuggestions([]); // hide suggestions once full search fires
    saveRecent(query.trim());
    // Log search to AI Profile
    setAiProfile(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        searchHistory: [query.trim(), ...prev.stats.searchHistory.filter(q => q !== query.trim())].slice(0, 10)
      }
    }));

    const songs = await musicService.searchSongs(query);
    setResults(songs);
    setLoading(false);
  }, [query, setAiProfile]);

  const addToSpace = (song: Song) => {
    // Log search-to-play interaction
    setAiProfile(prev => aiService.logInteraction(song, 'SEARCH', prev));
    
    setPlaylist(prev => {
      const existing = prev.find(s => s.id === song.id || (s.originalId && s.originalId === song.id));
      if (existing) return prev;
      return [...prev, song];
    });
    setIsOpen(false);
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const clickRecent = (r: string) => {
    setQuery(r);
    inputRef.current?.focus();
  };

  const close = () => { setIsOpen(false); setQuery(''); setResults([]); setSuggestions([]); setHasSearched(false); };

  const showSuggestions = suggestions.length > 0 || suggesting;
  const showResults    = hasSearched && !showSuggestions;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="search-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="search-container glass"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Input ── */}
            <div className="search-header">
              <div className="input-wrapper">
                <SearchIcon size={20} className="icon" />
                <form onSubmit={handleSearch} style={{ flex: 1 }}>
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search songs, artists, albums…"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setHasSearched(false); }}
                    autoFocus
                  />
                </form>
                {query && (
                  <button className="clear-btn" onClick={() => { setQuery(''); setSuggestions([]); setResults([]); setHasSearched(false); }}>
                    <X size={16} />
                  </button>
                )}
              </div>
              <button className="close-btn" onClick={close}><X size={24} /></button>
            </div>

            {/* ── Live Suggestions ── */}
            <AnimatePresence>
              {showSuggestions && (
                <motion.div
                  className="suggestions-box"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  {suggesting && suggestions.length === 0 ? (
                    <div className="suggestion-loading">
                      <div className="s-spinner" />
                      <span>Finding matches…</span>
                    </div>
                  ) : (
                    suggestions.map((song, i) => (
                      <motion.button
                        key={song.id}
                        className="suggestion-item"
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => addToSpace(song)}
                      >
                        <img src={song.image?.[0]?.link} alt="" />
                        <div className="s-info">
                          <span className="s-name">{song.name}</span>
                          <span className="s-artist">{song.primaryArtists}</span>
                        </div>
                        <Play size={14} className="s-play-icon" />
                      </motion.button>
                    ))
                  )}
                  <button className="suggestion-see-all" onClick={handleSearch}>
                    <SearchIcon size={14} />
                    Search for "<strong>{query}</strong>"
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Full Results ── */}
            <div className="search-results">
              {loading ? (
                <div className="loading">
                  <div className="s-spinner large" />
                  <span>Searching the galaxy…</span>
                </div>
              ) : showResults && results.length > 0 ? (
                results.map((song) => (
                  <div key={song.id} className="result-item" onClick={() => addToSpace(song)}>
                    <img src={song.image?.[0]?.link} alt={song.name} />
                    <div className="info">
                      <p className="name">{song.name}</p>
                      <p className="artist">{song.primaryArtists}</p>
                    </div>
                    <div className="play-hint"><Play size={16} fill="white" /></div>
                  </div>
                ))
              ) : showResults && results.length === 0 ? (
                <div className="empty-state">
                  <Music size={48} opacity={0.3} />
                  <p>No results for "<em>{query}</em>"</p>
                </div>
              ) : !hasSearched && !showSuggestions ? (
                <div className="idle-state">
                  {recents.length > 0 && (
                    <div className="recents-section">
                      <div className="section-label"><Clock size={13} /> Recent searches</div>
                      <div className="recent-chips">
                        {recents.map(r => (
                          <button key={r} className="recent-chip" onClick={() => clickRecent(r)}>{r}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="empty-state" style={{ paddingTop: recents.length ? '20px' : '40px' }}>
                    <TrendingUp size={36} opacity={0.25} />
                    <p>Type a song name to discover new worlds</p>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>

          <style>{`
            .search-modal {
              position: fixed;
              top: 0; left: 0;
              width: 100vw; height: 100vh;
              z-index: 200;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0,0,0,0.45);
              backdrop-filter: blur(6px);
            }
            @media (max-width: 768px) {
              .search-modal {
                height: calc(100vh - 68px);
                bottom: 68px;
                top: 0;
              }
            }
            .search-container {
              width: 92%;
              max-width: 620px;
              max-height: 82vh;
              display: flex;
              flex-direction: column;
              padding: 18px 18px 14px;
              color: white;
              border-radius: 20px;
              overflow: hidden;
            }
            .search-header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 6px;
            }
            .input-wrapper {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 12px;
              background: rgba(255,255,255,0.08);
              padding: 11px 16px;
              border-radius: 12px;
              border: 1px solid rgba(255,255,255,0.12);
              transition: border-color 0.2s;
            }
            .input-wrapper:focus-within {
              border-color: rgba(124,58,237,0.5);
              background: rgba(255,255,255,0.1);
            }
            .input-wrapper input {
              background: none;
              border: none;
              color: white;
              font-size: 1.05rem;
              width: 100%;
              outline: none;
            }
            .clear-btn {
              background: none;
              border: none;
              color: rgba(255,255,255,0.4);
              cursor: pointer;
              padding: 2px;
              display: flex;
              transition: color 0.15s;
              flex-shrink: 0;
            }
            .clear-btn:hover { color: white; }
            .close-btn {
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              opacity: 0.6;
              flex-shrink: 0;
              transition: opacity 0.15s;
            }
            .close-btn:hover { opacity: 1; }

            /* ── Suggestions ── */
            .suggestions-box {
              overflow: hidden;
              border-bottom: 1px solid rgba(255,255,255,0.07);
              margin: 0 -4px;
              padding: 4px 4px 0;
            }
            .suggestion-loading {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 12px;
              color: rgba(255,255,255,0.4);
              font-size: 0.85rem;
            }
            .suggestion-item {
              width: 100%;
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 8px 10px;
              border-radius: 10px;
              background: none;
              border: none;
              color: white;
              cursor: pointer;
              text-align: left;
              transition: background 0.15s;
            }
            .suggestion-item:hover { background: rgba(255,255,255,0.08); }
            .suggestion-item:hover .s-play-icon { opacity: 1; }
            .suggestion-item img {
              width: 40px; height: 40px;
              border-radius: 6px;
              object-fit: cover;
              flex-shrink: 0;
            }
            .s-info { flex: 1; overflow: hidden; }
            .s-name {
              font-size: 0.9rem;
              font-weight: 500;
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .s-artist {
              font-size: 0.75rem;
              color: rgba(255,255,255,0.45);
              display: block;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .s-play-icon {
              color: rgba(255,255,255,0.5);
              opacity: 0;
              transition: opacity 0.15s;
              flex-shrink: 0;
            }
            .suggestion-see-all {
              width: 100%;
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 9px 10px;
              border-radius: 10px;
              background: none;
              border: none;
              color: rgba(255,255,255,0.5);
              font-size: 0.83rem;
              cursor: pointer;
              text-align: left;
              transition: background 0.15s, color 0.15s;
              margin-top: 2px;
              margin-bottom: 6px;
            }
            .suggestion-see-all:hover { background: rgba(255,255,255,0.06); color: white; }
            .suggestion-see-all strong { color: white; font-weight: 600; }

            /* ── Results ── */
            .search-results {
              flex: 1;
              overflow-y: auto;
              padding-top: 8px;
              display: flex;
              flex-direction: column;
              gap: 4px;
            }
            .result-item {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 10px;
              border-radius: 10px;
              cursor: pointer;
              transition: background 0.2s;
            }
            .result-item:hover { background: rgba(255,255,255,0.08); }
            .result-item img { width: 50px; height: 50px; border-radius: 6px; object-fit: cover; }
            .result-item .info .name { font-weight: 600; font-size: 0.95rem; }
            .result-item .info .artist { font-size: 0.8rem; color: var(--text-secondary); }
            .play-hint {
              margin-left: auto;
              background: var(--accent-glow);
              width: 30px; height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transition: opacity 0.2s;
            }
            .result-item:hover .play-hint { opacity: 1; }

            /* ── Idle / empty ── */
            .idle-state { padding: 4px; }
            .recents-section { margin-bottom: 4px; }
            .section-label {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 0.75rem;
              color: rgba(255,255,255,0.35);
              text-transform: uppercase;
              letter-spacing: 0.07em;
              padding: 8px 6px 6px;
            }
            .recent-chips {
              display: flex;
              flex-wrap: wrap;
              gap: 6px;
              padding: 0 4px;
            }
            .recent-chip {
              padding: 5px 13px;
              border-radius: 20px;
              border: 1px solid rgba(255,255,255,0.12);
              background: rgba(255,255,255,0.05);
              color: rgba(255,255,255,0.7);
              font-size: 0.83rem;
              cursor: pointer;
              transition: background 0.15s, color 0.15s;
            }
            .recent-chip:hover { background: rgba(255,255,255,0.12); color: white; }

            .loading, .empty-state {
              text-align: center;
              padding: 40px 20px;
              color: var(--text-secondary);
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
            }
            .empty-state p { font-size: 0.92rem; opacity: 0.55; }

            /* ── Spinner ── */
            .s-spinner {
              width: 16px; height: 16px;
              border: 2px solid rgba(255,255,255,0.15);
              border-top-color: rgba(124,58,237,0.8);
              border-radius: 50%;
              animation: spin 0.7s linear infinite;
              flex-shrink: 0;
            }
            .s-spinner.large { width: 32px; height: 32px; border-width: 3px; }
            @keyframes spin { to { transform: rotate(360deg); } }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
