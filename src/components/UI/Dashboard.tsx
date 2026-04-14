import { useAtom } from 'jotai';
import { useEffect, useState, useRef, useCallback } from 'react';
import { musicService, type Song } from '../../services/musicService';
import { currentSongAtom, isPlayingAtom, playlistAtom, isSearchOpenAtom, localLikedSongsAtom, localPlaylistsAtom, userAiProfileAtom } from '../../store/atoms';
import { aiService, type ScoredSong } from '../../services/aiService';
import { Home, Play, Plus, Clock, ChevronRight, Activity, Search as SearchIcon, X, Heart, ListMusic, Moon, Users, Copy, Check, Wifi, Bell, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';

export function Dashboard() {
  const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
  const [, setIsPlaying] = useAtom(isPlayingAtom);
  const [playlist, setPlaylist] = useAtom(playlistAtom);
  const [, setIsSearchOpen] = useAtom(isSearchOpenAtom);
  const [likedSongs, setLikedSongs] = useAtom(localLikedSongsAtom);
  const [savedPlaylist, setSavedPlaylist] = useAtom(localPlaylistsAtom);
  const [userAiProfile] = useAtom(userAiProfileAtom);
  
  const [trending, setTrending] = useState<Song[]>([]);
  const [charts, setCharts] = useState<Song[]>([]);
  const [aiRecs, setAiRecs] = useState<ScoredSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCategory, setCurrentCategory] = useState('All');
  const [showLikedPopup, setShowLikedPopup] = useState(false);
  const [showPlaylistPopup, setShowPlaylistPopup] = useState<string | null>(null);
  const [showMoonify, setShowMoonify] = useState(false);
  const [loadingMoreAi, setLoadingMoreAi] = useState(false);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [moonifyActive, setMoonifyActive] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [jamMembers, setJamMembers] = useState(1);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  // Generate QR code whenever session code changes
  useEffect(() => {
    if (!sessionCode || !qrRef.current) return;
    const url = `${window.location.origin}?moonify=${sessionCode}`;
    QRCode.toCanvas(qrRef.current, url, {
      width: 180,
      margin: 2,
      color: { dark: '#c084fc', light: '#0e0a18' },
    });
  }, [sessionCode, showMoonify]);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const startMoonify = useCallback(() => {
    const code = generateCode();
    setSessionCode(code);
    setMoonifyActive(true);
    // BroadcastChannel lets multiple same-origin tabs sync
    const ch = new BroadcastChannel(`moonify_${code}`);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      if (e.data.type === 'JOIN') setJamMembers(n => n + 1);
      if (e.data.type === 'LEAVE') setJamMembers(n => Math.max(1, n - 1));
    };
  }, []);

  const stopMoonify = useCallback(() => {
    channelRef.current?.postMessage({ type: 'LEAVE' });
    channelRef.current?.close();
    channelRef.current = null;
    setMoonifyActive(false);
    setSessionCode('');
    setJamMembers(1);
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?moonify=${sessionCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createPlaylist = () => {
    const name = prompt("Enter playlist name:") || "New Playlist";
    setSavedPlaylist(prev => [...prev, { id: `playlist-${Date.now()}`, name, songs: [] }]);
  };
  
  const playAllSongs = (songs: Song[]) => {
    if (songs.length === 0) return;
    setPlaylist(songs);
    setCurrentSong(songs[0]);
    setIsPlaying(true);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [trendingData, chartsData, aiData] = await Promise.all([
        musicService.getTrending(),
        musicService.getCharts(),
        aiService.getRankedRecommendations(userAiProfile, likedSongs, 20)
      ]);
      setTrending(trendingData);
      setCharts(chartsData);
      setAiRecs(aiData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchMoreAiRecs = useCallback(async () => {
    if (loadingMoreAi || loading) return;
    setLoadingMoreAi(true);
    try {
      // Get fresh recommendations
      const moreRecs = await aiService.getRankedRecommendations(userAiProfile, likedSongs, 10);
      
      setAiRecs(prev => {
        // Filter out existing ones to be safe
        const existingIds = new Set(prev.map(r => r.song.id));
        const filtered = moreRecs.filter(r => !existingIds.has(r.song.id));
        return [...prev, ...filtered];
      });
    } finally {
      setLoadingMoreAi(false);
    }
  }, [loadingMoreAi, loading, userAiProfile, likedSongs]);

  useEffect(() => {
    if (loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMoreAiRecs();
      }
    }, { threshold: 0.1 });

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loading, fetchMoreAiRecs]);

  const playSong = (song: Song) => {
    // CRITICAL: Check if a version of this song is already in the queue (using originalId matching)
    // If so, we MUST play the version in the queue to maintain the player's unique mutated IDs.
    setPlaylist(prev => {
      const existingInQueue = prev.find(s => s.id === song.id || (s.originalId && s.originalId === song.id));
      
      if (existingInQueue) {
        setCurrentSong(existingInQueue);
        setIsPlaying(true);
        return prev;
      }
      
      // If not in queue, handle as usual
      setCurrentSong(song);
      setIsPlaying(true);
      
      const currentIdx = prev.findIndex(s => s.id === currentSong?.id);
      if (currentIdx !== -1) {
        const newQueue = [...prev];
        newQueue.splice(currentIdx + 1, 0, song);
        return newQueue;
      }
      return [...prev, song];
    });
  };

  const addToQueue = (song: Song, e: React.MouseEvent) => {
    e.stopPropagation();
    setPlaylist(prev => {
      // Check originalId too
      if (prev.find(s => s.id === song.id || (s.originalId && s.originalId === song.id))) return prev;
      if (!currentSong) {
        setCurrentSong(song);
        setIsPlaying(true);
      }
      return [...prev, song];
    });
  };

  const categories = ['Music', 'Podcasts & Shows'];

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '3:45';
    const mins = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Filter trending based on category (mock logic since API doesn't specify deeply)
  const filteredTrending = currentCategory === 'All' ? trending : trending.filter(s => s.language === currentCategory.toLowerCase() || (currentCategory === 'Music'));

  return (
    <motion.div 
      className="dashboard-overlay glass"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <div className="dashboard-grid">
        {/* Left Sidebar */}
        <aside className="dash-sidebar">
          <nav>
            <button className="nav-item active"><Home size={22} /><span>Home</span></button>
            <button
              className={`nav-item moonify-nav ${moonifyActive ? 'moonify-live' : ''}`}
              onClick={() => setShowMoonify(true)}
            >
              <Moon size={22} />
              <span>Moonify</span>
              {moonifyActive && <span className="live-dot" />}
            </button>
          </nav>
          
          <div className="sidebar-group">
            <h4>Your Library</h4>
            <button className="add-playlist" onClick={createPlaylist}><Plus size={16} /> Create Playlist</button>
            <div className="playlist-list" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              
              <div className="spotify-list-item" onClick={() => setShowLikedPopup(true)}>
                <div className="item-icon" style={{ background: 'linear-gradient(135deg, #4b21ee, #e4a2d0)' }}>
                  <Heart size={20} fill="#fff" color="#fff" />
                </div>
                <div className="item-info">
                  <span className="item-title">Liked Songs</span>
                  <span className="item-subtitle">📌 Playlist • {likedSongs?.length || 0} songs</span>
                </div>
              </div>

              {savedPlaylist?.map((p, i) => (
                <div key={p.id} className="spotify-list-item" onClick={() => setShowPlaylistPopup(p.id)}>
                  <div className="item-icon" style={{ background: i % 2 === 0 ? '#0f613c' : '#282828' }}>
                    <ListMusic size={20} color={i % 2 === 0 ? "#1ed760" : "#b3b3b3"} />
                  </div>
                  <div className="item-info">
                    <span className="item-title">{p.name}</span>
                    <span className="item-subtitle">Playlist • {p.songs.length} songs</span>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dash-main scrollbar-hidden">
          <header className="dash-content-header">
            <div className="mobile-only mobile-spotify-header">
              <h1>{getGreeting()}</h1>
              <div className="header-icon-stack">
                <Bell size={22} strokeWidth={2.5} />
                <Clock size={22} strokeWidth={2.5} />
                <Settings size={22} strokeWidth={2.5} />
              </div>
            </div>

            <div className="header-top desktop-only">
              <div className="search-bar-wrap" onClick={() => setIsSearchOpen(true)}>
                <SearchIcon size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search for stars, galaxies, or songs..." 
                  className="search-input"
                  onFocus={() => setIsSearchOpen(true)}
                  readOnly
                />
              </div>
              <div className="user-profile">
                <div className="notifications"><Activity size={18} /></div>
                <div className="profile-badge">
                  <div className="avatar">S</div>
                  <span>Sujal</span>
                </div>
              </div>
            </div>

            <div className="category-tabs scrollbar-hidden">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  className={`tab ${currentCategory === cat ? 'active' : ''}`}
                  onClick={() => setCurrentCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </header>

          {/* Quick Access Grid (Mobile only) */}
          <div className="mobile-only quick-access-grid">
            <div className="quick-item glass" onClick={() => setShowLikedPopup(true)}>
              <div className="quick-img-wrap liked-grad">
                <Heart fill="#fff" size={20} />
              </div>
              <span>Liked Songs</span>
            </div>
            {trending.slice(0, 5).map(song => (
              <div key={song.id} className="quick-item glass" onClick={() => playSong(song)}>
                <div className="quick-img-wrap">
                  <img src={song.image?.[0]?.link} alt="" />
                </div>
                <span>{song.name}</span>
              </div>
            ))}
          </div>

          {aiRecs.length > 0 && (
            <section className="dash-section ai-recommended">
              <div className="section-header">
                <div className="title-with-badge">
                  <h2>Recommended for You</h2>
                  <span className="ai-badge">AI Optimized</span>
                </div>
                <button className="see-all" onClick={() => aiService.getRankedRecommendations(userAiProfile, likedSongs, 20).then(setAiRecs)}>
                  Refresh <Activity size={14} style={{ marginLeft: '4px' }} />
                </button>
              </div>
              
              <div className="song-row scrollbar-hidden">
                {aiRecs.map(rec => (
                  <motion.div 
                    key={rec.song.id} 
                    className="song-card ai-card"
                    whileHover={{ y: -5 }}
                    onClick={() => playSong(rec.song)}
                  >
                    <div className="card-art">
                      <img src={rec.song.image?.[2]?.link || rec.song.image?.[0]?.link} alt="" loading="lazy" />
                      <div className="confidence-chip">
                        {(rec.confidence * 100).toFixed(0)}% match
                      </div>
                      <div className="card-actions-overlay">
                        <button className="icon-btn-overlay" onClick={(e) => addToQueue(rec.song, e)} title="Add to Queue">
                          <Plus size={20} />
                        </button>
                        <button className="play-btn-overlay">
                          <Play size={24} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                    <div className="card-info">
                      <h3>{rec.song.name}</h3>
                      <p>{rec.song.primaryArtists}</p>
                      <span className="ai-reason">{rec.reason}</span>
                    </div>
                  </motion.div>
                ))}
                
                {/* Intersection Sentinel */}
                <div ref={loadMoreRef} style={{ minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {loadingMoreAi && (
                    <div className="pulse" style={{ color: '#c084fc', fontStyle: 'italic', fontSize: '0.8rem' }}>
                      Gathering...
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          <section className="dash-section">
            <div className="section-header">
              <h2>Trending in Orbit</h2>
              <button className="see-all">Show all <ChevronRight size={16} /></button>
            </div>
            
            <div className="song-row scrollbar-hidden">
              {loading ? (
                Array(6).fill(0).map((_, i) => <div key={i} className="skeleton-card" />)
              ) : (
                filteredTrending.slice(0, 12).map(song => (
                  <motion.div 
                    key={song.id} 
                    className="song-card"
                    whileHover={{ y: -5 }}
                    onClick={() => playSong(song)}
                  >
                    <div className="card-art">
                      <img src={song.image?.[2]?.link || song.image?.[0]?.link} alt="" loading="lazy" />
                      <div className="card-actions-overlay">
                        <button className="icon-btn-overlay" onClick={(e) => addToQueue(song, e)} title="Add to Queue">
                          <Plus size={18} />
                        </button>
                        <button className="play-btn-overlay primary" onClick={(e) => { e.stopPropagation(); playSong(song); }}>
                          <Play fill="black" size={20} style={{ marginLeft: '3px' }}/>
                        </button>
                      </div>
                    </div>
                    <div className="card-info">
                      <h3>{song.name}</h3>
                      <p>{song.primaryArtists}</p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </section>

          <section className="dash-section">
            <div className="section-header">
              <h2>Interstellar Charts</h2>
            </div>
            <div className="charts-list">
              {charts.slice(0, 6).map((song, idx) => (
                <div key={song.id} className="chart-item" onClick={() => playSong(song)}>
                  <span className="rank">{idx + 1}</span>
                  <img src={song.image?.[1]?.link || song.image?.[0]?.link} alt="" />
                  <div className="info">
                    <h4>{song.name}</h4>
                    <p>{song.primaryArtists}</p>
                  </div>
                  <div className="meta">
                    <Clock size={14} /> {formatDuration(song.duration)}
                  </div>
                  <button className="icon-btn list-add" onClick={(e) => addToQueue(song, e)} title="Add to Queue">
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </main>

        {/* Right Context Bar */}
        <aside className="dash-context">
          <div className="context-card glass">
            <div className="playing-header">
              <Activity size={18} className="pulse" />
              <span>Solar activity</span>
            </div>
            <div className="context-content">
              <h3>Dhanda Nyoliwala Mix</h3>
              <p>Top Artists of the week</p>
              <div className="artist-avatars">
                <div className="avatar" style={{ background: '#FF4D4D' }} />
                <div className="avatar" style={{ background: '#4D94FF' }} />
                <div className="avatar" style={{ background: '#FFD700' }} />
              </div>
            </div>
          </div>

          <div className="next-queue glass">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h4>Coming Up Next</h4>
            </div>
            <div className="queue-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {(() => {
                 const currentIdx = playlist.findIndex(s => s.id === currentSong?.id);
                 const upcoming = currentSong && currentIdx !== -1 ? playlist.slice(currentIdx + 1) : playlist;
                 return upcoming.length > 0 ? (
                   upcoming.slice(0, 8).map(song => (
                     <div 
                       key={song.id} 
                       className="queue-item" 
                       style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '5px' }}
                     >
                       <img 
                         src={song.image?.[0]?.link} 
                         alt="" 
                         onClick={() => playSong(song)} 
                         style={{ cursor: 'pointer', width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover' }} 
                       />
                       <div 
                         style={{ cursor: 'pointer', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                         onClick={() => playSong(song)} 
                       >
                         <span style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {song.name}
                         </span>
                         <span style={{ fontSize: '0.7rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                           {song.primaryArtists}
                         </span>
                       </div>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setPlaylist(prev => prev.filter(s => s.id !== song.id));
                         }}
                         className="remove-queue-btn"
                         title="Remove from Queue"
                       >
                         <X size={16} />
                       </button>
                     </div>
                   ))
                 ) : (
                   <div style={{ opacity: 0.5, fontSize: '0.8rem', textAlign: 'center', margin: '20px 0' }}>
                     {currentSong ? "Analyzing Universe for next track..." : "Play a song to start exploring."}
                   </div>
                 );
              })()}
            </div>
          </div>
        </aside>
      </div>



      {/* Liked Songs Popup Model */}
      {showLikedPopup && (
        <div className="liked-popup-overlay" onClick={() => setShowLikedPopup(false)}>
          <div className="liked-popup glass" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h2><Heart size={20} fill="#FF4D4D" color="#FF4D4D"/> Your Liked Songs</h2>
                <button className="play-btn-overlay primary" onClick={() => playAllSongs(likedSongs)} style={{ position: 'relative', width: '36px', height: '36px', opacity: 1, visibility: 'visible' }}>
                  <Play fill="black" size={18} style={{ marginLeft: '2px' }}/>
                </button>
              </div>
              <button className="icon-btn" onClick={() => setShowLikedPopup(false)}><X size={20}/></button>
            </div>
            <div className="liked-list scrollbar-hidden">
              {likedSongs && likedSongs.length > 0 ? (
                likedSongs.map((song, idx) => (
                  <div key={song.id + idx} className="chart-item" onClick={() => { playSong(song); setShowLikedPopup(false); }}>
                    <img src={song.image?.[1]?.link || song.image?.[0]?.link} alt="" />
                    <div className="info" style={{ flex: 1 }}>
                      <h4>{song.name}</h4>
                      <p>{song.primaryArtists}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setLikedSongs(prev => prev.filter(s => s.id !== song.id));
                      }}
                      className="remove-queue-btn"
                      title="Remove from Liked Songs"
                      style={{ background: 'transparent' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">No liked songs yet... Start clicking hearts!</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Playlist Popup Model */}
      {showPlaylistPopup && (() => {
        const activePlaylist = savedPlaylist.find(p => p.id === showPlaylistPopup);
        if (!activePlaylist) return null;
        return (
          <div className="liked-popup-overlay" onClick={() => setShowPlaylistPopup(null)}>
            <div className="liked-popup glass" onClick={e => e.stopPropagation()}>
              <div className="popup-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h2><ListMusic size={20} color="#38BDF8"/> {activePlaylist.name}</h2>
                  <button className="play-btn-overlay primary" onClick={() => playAllSongs(activePlaylist.songs)} style={{ position: 'relative', width: '36px', height: '36px', opacity: 1, visibility: 'visible' }}>
                    <Play fill="black" size={18} style={{ marginLeft: '2px' }}/>
                  </button>
                </div>
                <button className="icon-btn" onClick={() => setShowPlaylistPopup(null)}><X size={20}/></button>
              </div>
              <div className="liked-list scrollbar-hidden">
                {activePlaylist.songs && activePlaylist.songs.length > 0 ? (
                  activePlaylist.songs.map((song, idx) => (
                    <div key={song.id + idx} className="chart-item" onClick={() => { playSong(song); setShowPlaylistPopup(null); }}>
                      <img src={song.image?.[1]?.link || song.image?.[0]?.link} alt="" />
                      <div className="info" style={{ flex: 1 }}>
                        <h4>{song.name}</h4>
                        <p>{song.primaryArtists}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSavedPlaylist(prev => prev.map(p => {
                            if (p.id === activePlaylist.id) {
                              return { ...p, songs: p.songs.filter(s => s.id !== song.id) };
                            }
                            return p;
                          }));
                        }}
                        className="remove-queue-btn"
                        title="Remove from Playlist"
                        style={{ background: 'transparent' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">This playlist is empty! Add songs using the player button.</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
      {/* Moonify (Jam) Modal */}
      <AnimatePresence>
        {showMoonify && (
          <motion.div
            className="liked-popup-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowMoonify(false)}
          >
            <motion.div
              className="moonify-modal glass"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="moonify-header">
                <div className="moonify-title">
                  <Moon size={22} className="moon-icon-glow" />
                  <span>Moonify</span>
                  {moonifyActive && (
                    <span className="live-badge"><Wifi size={11} /> LIVE</span>
                  )}
                </div>
                <button className="icon-btn" onClick={() => setShowMoonify(false)}><X size={20} /></button>
              </div>

              {/* Song preview */}
              {currentSong && (
                <div className="moonify-now-playing">
                  <img src={currentSong.image?.[1]?.link || currentSong.image?.[0]?.link} alt="" />
                  <div>
                    <p className="mnp-name">{currentSong.name}</p>
                    <p className="mnp-artist">{currentSong.primaryArtists}</p>
                  </div>
                </div>
              )}

              {!moonifyActive ? (
                /* Start screen */
                <div className="moonify-start">
                  <p className="moonify-desc">
                    Start a <strong>Moonify session</strong> and vibe together in real-time.
                    Share the link with friends — everyone hears the same song, same moment. 🌙
                  </p>
                  <button className="moonify-btn primary" onClick={startMoonify}>
                    <Moon size={18} /> Start Moonifying
                  </button>
                </div>
              ) : (
                /* Active session */
                <div className="moonify-active-section">
                  <div className="moonify-members">
                    <Users size={16} />
                    <span>{jamMembers} {jamMembers === 1 ? 'person' : 'people'} listening</span>
                  </div>

                  {/* QR Code */}
                  <div className="qr-wrapper">
                    <div className="qr-glow-ring">
                      <canvas ref={qrRef} className="qr-canvas" />
                    </div>
                    <p className="qr-hint">Scan to join this Moonify session</p>
                  </div>

                  <div className="session-code-block">
                    <span className="code-label">SESSION CODE</span>
                    <span className="code-value">{sessionCode}</span>
                  </div>

                  <button className="moonify-btn copy-btn" onClick={copyLink}>
                    {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy invite link</>}
                  </button>

                  <button className="moonify-btn danger" onClick={stopMoonify}>
                    End Session
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      <style>{`
        /* ── Moonify Nav ── */
        .moonify-nav { position: relative; }
        .moonify-nav:hover { color: #c084fc !important; }
        .moonify-nav:hover svg { filter: drop-shadow(0 0 6px #c084fc); }
        .moonify-live { color: #c084fc !important; }
        .moonify-live svg { filter: drop-shadow(0 0 8px #c084fc); animation: moonPulse 2s ease-in-out infinite; }
        @keyframes moonPulse { 0%,100% { filter: drop-shadow(0 0 6px #c084fc); } 50% { filter: drop-shadow(0 0 14px #c084fc); } }
        .live-dot {
          position: absolute; top: 6px; right: 8px;
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: blink 1.4s ease-in-out infinite;
        }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

        /* ── Moonify Modal ── */
        .moonify-modal {
          width: 92%; max-width: 380px;
          background: rgba(14, 10, 24, 0.92);
          border: 1px solid rgba(192, 132, 252, 0.3);
          border-radius: 22px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-shadow: 0 0 60px rgba(192, 132, 252, 0.15);
        }
        .moonify-header {
          display: flex; align-items: center; justify-content: space-between;
        }
        .moonify-title {
          display: flex; align-items: center; gap: 10px;
          font-size: 1.2rem; font-weight: 700; color: white;
        }
        .moon-icon-glow { color: #c084fc; filter: drop-shadow(0 0 8px #c084fc); }
        .live-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #22c55e;
          font-size: 0.68rem; font-weight: 700;
          padding: 3px 8px; border-radius: 20px;
          letter-spacing: 0.06em;
        }
        .moonify-now-playing {
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.05);
          border-radius: 12px; padding: 10px 12px;
        }
        .moonify-now-playing img {
          width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0;
        }
        .mnp-name { font-size: 0.92rem; font-weight: 600; color: white; margin-bottom: 2px; }
        .mnp-artist { font-size: 0.75rem; color: rgba(255,255,255,0.45); }

        .moonify-start, .moonify-active-section {
          display: flex; flex-direction: column; gap: 14px;
        }
        .moonify-desc {
          font-size: 0.88rem; color: rgba(255,255,255,0.6); line-height: 1.6;
        }
        .moonify-desc strong { color: #c084fc; }
        .moonify-btn {
          width: 100%; padding: 12px;
          border: none; border-radius: 12px;
          font-size: 0.9rem; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .moonify-btn:hover { transform: translateY(-1px); }
        .moonify-btn.primary {
          background: linear-gradient(135deg, #7c3aed, #c084fc);
          color: white;
          box-shadow: 0 4px 20px rgba(124,58,237,0.4);
        }
        .moonify-btn.primary:hover { box-shadow: 0 6px 28px rgba(124,58,237,0.55); }
        .moonify-btn.copy-btn {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: white;
        }
        .moonify-btn.danger {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          color: #f87171;
        }
        .moonify-members {
          display: flex; align-items: center; gap: 8px;
          color: rgba(255,255,255,0.5); font-size: 0.84rem;
        }
        .session-code-block {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: rgba(124,58,237,0.1);
          border: 1px solid rgba(192,132,252,0.25);
          border-radius: 14px; padding: 16px;
        }
        .code-label {
          font-size: 0.68rem; letter-spacing: 0.12em;
          color: rgba(192,132,252,0.6); font-weight: 600;
          text-transform: uppercase;
        }
        .code-value {
          font-size: 2rem; font-weight: 800; letter-spacing: 0.18em;
          color: #c084fc; font-family: monospace;
        }

        /* ── QR Code ── */
        .qr-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .qr-glow-ring {
          padding: 10px;
          border-radius: 16px;
          background: #0e0a18;
          border: 1px solid rgba(192, 132, 252, 0.3);
          box-shadow: 0 0 30px rgba(192, 132, 252, 0.2), inset 0 0 20px rgba(192, 132, 252, 0.05);
          position: relative;
        }
        .qr-glow-ring::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          background: linear-gradient(135deg, rgba(192,132,252,0.4), transparent, rgba(124,58,237,0.4));
          z-index: -1;
          animation: qrBorderSpin 4s linear infinite;
        }
        @keyframes qrBorderSpin {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .qr-canvas { display: block; border-radius: 8px; }
        .qr-hint {
          font-size: 0.75rem;
          color: rgba(192, 132, 252, 0.55);
          text-align: center;
        }

        .liked-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(8px);
          z-index: 500;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (max-width: 768px) {
          .liked-popup-overlay {
            height: calc(100vh - 68px);
            bottom: 68px;
            top: 0;
          }
        }

        .liked-popup {
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          background: rgba(20, 20, 20, 0.8);
          border: 1px solid rgba(255, 77, 77, 0.3);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          padding: 25px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .popup-header h2 { display: flex; align-items: center; gap: 10px; font-size: 1.2rem; }
        .liked-list {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .empty-state {
          text-align: center;
          padding: 40px;
          color: rgba(255,255,255,0.4);
          font-style: italic;
        }

        .dashboard-overlay {
          position: fixed;
          top: var(--header-height);
          left: 15px;
          right: 15px;
          bottom: calc(var(--player-height) + 10px);
          z-index: 40;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.45);
          backdrop-filter: blur(40px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 15px 50px rgba(0,0,0,0.6);
          transition: all 0.3s ease;
        }

        @media (max-width: 768px) {
          .dashboard-overlay {
            top: var(--header-height);
            left: 0;
            right: 0;
            bottom: calc(var(--player-height) + var(--mobile-nav-height));
            border-radius: 0;
            border: none;
            box-shadow: none; /* Removed for clean mobile edges */
          }
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: var(--sidebar-width) 1fr 300px;
          height: 100%;
          transition: grid-template-columns 0.3s ease;
        }

        @media (max-width: 1200px) {
          .dashboard-grid {
             grid-template-columns: var(--sidebar-width) 1fr;
          }
          .dash-context { display: none !important; }
        }

        @media (max-width: 768px) {
          .dash-main { 
            padding: 15px; 
            padding-bottom: 200px !important; /* Plenty of space for Nav (70) + Player (72) + Babe Pill */
          }
        }

        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          .dash-sidebar { display: none !important; }
          .dash-main { padding: 15px 20px !important; }
        }

        /* Sidebar */
        .dash-sidebar {
          background: rgba(0, 0, 0, 0.2);
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          padding: 25px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 15px;
          background: none;
          border: none;
          color: white;
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 500;
          opacity: 0.6;
          transition: all 0.2s;
        }
        .nav-item.active { opacity: 1; background: rgba(255, 255, 255, 0.1); }
        .nav-item:hover { opacity: 1; transform: translateX(5px); }
        
        .sidebar-group h4 {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 15px;
        }
        .add-playlist {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.85rem;
        }

        .spotify-list-item {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          border-radius: 6px;
          padding: 8px;
          transition: background 0.2s;
        }
        .spotify-list-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .item-icon {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-shrink: 0;
        }
        .item-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .item-title {
          color: #fff;
          font-size: 0.95rem;
          font-weight: 500;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .item-subtitle {
          color: #b3b3b3;
          font-size: 0.8rem;
          margin-top: 4px;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        /* Main */
        .dash-main {
          padding: 20px 40px;
          overflow-y: auto;
        }
        .dash-content-header { margin-bottom: 20px; }
        
        /* AI Recommended Styles */
        .title-with-badge {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ai-badge {
          font-size: 0.65rem;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          background: linear-gradient(135deg, #a855f7, #38bdf8);
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 10px rgba(168,85,247,0.4);
        }
        .ai-card {
          border: 1px solid rgba(168,85,247,0.15);
          background: linear-gradient(180deg, rgba(168,85,247,0.05) 0%, rgba(255,255,255,0.02) 100%);
        }
        .confidence-chip {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 4px 8px;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          border-radius: 6px;
          font-size: 0.7rem;
          color: #c084fc;
          font-weight: 700;
          z-index: 5;
          border: 1px solid rgba(192,132,252,0.3);
        }
        .ai-reason {
          display: block;
          font-size: 0.65rem;
          color: #c084fc;
          margin-top: 6px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          opacity: 0.8;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .search-bar-wrap {
          flex: 1;
          max-width: 500px;
          position: relative;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
        }
        .search-bar-wrap:focus-within {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.05);
        }
        .search-input {
          background: none;
          border: none;
          color: white;
          width: 100%;
          padding: 10px 0;
          font-size: 0.9rem;
          outline: none;
        }
        .search-icon { opacity: 0.5; }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .notifications {
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          cursor: pointer;
          opacity: 0.7;
          transition: 0.2s;
        }
        .notifications:hover { opacity: 1; background: rgba(255, 255, 255, 0.1); }
        .profile-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 5px 15px 5px 5px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 30px;
          cursor: pointer;
        }
        .profile-badge .avatar {
          width: 32px;
          height: 32px;
          background: var(--accent-glow);
          color: black;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
        }

        /* Spotify Mobile Specifics */
        .mobile-spotify-header {
          display: none;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .mobile-spotify-header h1 {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header-icon-stack {
          display: flex;
          gap: 18px;
          color: white;
        }

        @media (max-width: 768px) {
          .mobile-spotify-header { display: flex; }
          .category-tabs { margin-bottom: 25px; overflow-x: auto; padding-bottom: 5px; }
          .tab { 
            padding: 6px 16px !important; 
            font-size: 0.8rem !important; 
            background: rgba(255,255,255,0.08) !important;
          }
          .tab.active { background: #1db954 !important; color: white !important; }
        }

        .quick-access-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 30px;
        }
        .quick-item {
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05);
          height: 56px;
          transition: background 0.2s;
        }
        .quick-item:active { background: rgba(255, 255, 255, 0.15); }
        .quick-img-wrap {
          width: 56px;
          height: 56px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #282828;
        }
        .quick-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .quick-item span {
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          padding-right: 5px;
        }
        .liked-grad { background: linear-gradient(135deg, #450af5, #c4efd9); }
        .profile-badge span { font-size: 0.85rem; font-weight: 500; }

        .category-tabs { display: flex; gap: 10px; }
        .tab {
          padding: 8px 20px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        .tab.active { background: white; color: black; }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .section-header h2 { font-size: 1.5rem; letter-spacing: -0.5px; }
        .see-all { 
          background: none; border: none; color: var(--text-secondary); 
          cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.85rem;
        }

        .song-row {
          display: flex;
          gap: 20px;
          overflow-x: auto;
          padding-bottom: 20px;
        }
        .song-card {
          min-width: 180px;
          background: rgba(255, 255, 255, 0.03);
          padding: 15px;
          border-radius: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .song-card:hover { background: rgba(255, 255, 255, 0.1); }
        .card-art {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          margin-bottom: 15px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          background: #111;
        }
        .card-art img { width: 100%; height: 100%; object-fit: cover; }

        .card-actions-overlay {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s;
        }
        .song-card:hover .card-actions-overlay { opacity: 1; transform: translateY(0); }

        .icon-btn-overlay {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
          backdrop-filter: blur(5px);
        }
        .icon-btn-overlay:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }

        .play-btn-overlay.primary {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: var(--accent-glow);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 5px 15px rgba(0, 210, 255, 0.4);
        }
        .play-btn-overlay.primary:hover { transform: scale(1.05); }

        .card-info h3 { font-size: 0.95rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card-info p { font-size: 0.75rem; color: var(--text-secondary); }

        .charts-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .chart-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }
        .chart-item:hover { background: rgba(255, 255, 255, 0.08); }
        
        .icon-btn.list-add {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: 0.2s;
        }
        .chart-item:hover .icon-btn.list-add { opacity: 1; }
        .icon-btn.list-add:hover { background: rgba(255,255,255,0.2); transform: scale(1.1); }

        .rank { opacity: 0.5; width: 25px; font-weight: 700; text-align: center; }
        .chart-item img { width: 45px; height: 45px; border-radius: 6px; background: #111; }
        .chart-item .info { flex: 1; }
        .chart-item h4 { font-size: 0.9rem; margin-bottom: 2px; }
        .chart-item .meta { font-size: 0.7rem; color: var(--text-secondary); display: flex; align-items: center; gap: 5px; }

        /* Context Bar */
        .dash-context {
          padding: 25px;
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .context-card {
          padding: 20px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(0, 210, 255, 0.1), rgba(0, 0, 0, 0.3));
        }
        .playing-header {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.75rem;
          color: var(--accent-glow);
          margin-bottom: 15px;
          text-transform: uppercase;
          font-weight: 700;
        }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.4 } 50% { opacity: 1 } 100% { opacity: 0.4 } }
        
        .artist-avatars { display: flex; margin-top: 15px; }
        .avatar {
          width: 35px;
          height: 35px;
          border-radius: 50%;
          border: 2px solid #000;
          margin-right: -10px;
        }
        .next-queue h4 { font-size: 0.9rem; margin-bottom: 15px; }
        .queue-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          font-size: 0.8rem;
          opacity: 0.7;
        }

        .scrollbar-hidden::-webkit-scrollbar { display: none; }
        .skeleton-card {
          min-width: 180px;
          height: 240px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          animation: pulse 2s infinite;
        }


      `}</style>
    </motion.div>
  );
}
