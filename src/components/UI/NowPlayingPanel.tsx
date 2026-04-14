import { useAtom } from 'jotai';
import { currentSongAtom, isPlayingAtom, localLikedSongsAtom } from '../../store/atoms';
import { useEffect, useState, useRef } from 'react';
import { musicService } from '../../services/musicService';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Share2, Plus, ChevronDown, Music2, ExternalLink } from 'lucide-react';
import './NowPlayingPanel.css';


interface Props {
  open: boolean;
  onClose: () => void;
}

export function NowPlayingPanel({ open, onClose }: Props) {
  const [currentSong] = useAtom(currentSongAtom);
  const [isPlaying] = useAtom(isPlayingAtom);
  const [likedSongs, setLikedSongs] = useAtom(localLikedSongsAtom);
  const [artistInfo, setArtistInfo] = useState<any>(null);
  const [artistLoading, setArtistLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLiked = currentSong
    ? likedSongs.some(s => s.originalId === (currentSong.originalId || currentSong.id) || s.id === currentSong.id)
    : false;

  // Fetch artist info whenever the song changes
  useEffect(() => {
    if (!currentSong || !open) return;
    setArtistInfo(null);
    setArtistLoading(true);
    const firstName = currentSong.primaryArtists?.split(/[,&]/)[0]?.trim();
    if (firstName && firstName !== 'Unknown Artist') {
      musicService.searchArtist(firstName).then(data => {
        setArtistInfo(data);
        setArtistLoading(false);
      });
    } else {
      setArtistLoading(false);
    }
  }, [currentSong?.id, open]);

  if (!currentSong) return null;

  const heroImage = currentSong.image?.[2]?.link || currentSong.image?.[1]?.link || currentSong.image?.[0]?.link;
  const artistImage = artistInfo?.image?.[2]?.link || artistInfo?.image?.[1]?.link || artistInfo?.image?.[0]?.link || heroImage;
  const listeners = artistInfo?.followerCount
    ? Number(artistInfo.followerCount).toLocaleString()
    : null;
  const bio = artistInfo?.bio?.[0]?.text || artistInfo?.description || null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="np-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="np-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="np-handle" onClick={onClose}>
              <ChevronDown size={22} />
            </div>

            <div className="np-scroll" ref={scrollRef}>
              {/* Hero album art */}
              <div className="np-hero">
                <img src={heroImage} alt={currentSong.name} className="np-hero-img" />
                <div className="np-hero-overlay" />
                {/* Now playing indicator */}
                {isPlaying && (
                  <div className="np-playing-badge">
                    <span className="eq-bar" /><span className="eq-bar" /><span className="eq-bar" />
                    Playing
                  </div>
                )}
              </div>

              {/* Song info */}
              <div className="np-song-info">
                <div className="np-song-meta">
                  <h1 className="np-song-name">{currentSong.name}</h1>
                  <p className="np-artists">{currentSong.primaryArtists}</p>
                  {currentSong.album?.name && currentSong.album.name !== currentSong.name && (
                    <p className="np-album">
                      <Music2 size={12} style={{ display: 'inline', marginRight: 5 }} />
                      {currentSong.album.name}
                      {currentSong.year ? ` · ${currentSong.year}` : ''}
                    </p>
                  )}
                </div>

                <div className="np-actions">
                  <button
                    className={`np-icon-btn ${isLiked ? 'liked' : ''}`}
                    title={isLiked ? 'Remove from Liked' : 'Save to Liked'}
                    onClick={() => {
                      if (isLiked) {
                        setLikedSongs(prev => prev.filter(s =>
                          s.originalId !== (currentSong.originalId || currentSong.id) && s.id !== currentSong.id
                        ));
                      } else {
                        setLikedSongs(prev => [...prev, currentSong]);
                      }
                    }}
                  >
                    <Heart size={22} fill={isLiked ? '#ff4d6d' : 'transparent'} color={isLiked ? '#ff4d6d' : 'currentColor'} />
                  </button>
                  <button className="np-icon-btn" title="Add to playlist"><Plus size={22} /></button>
                  <button
                    className="np-icon-btn"
                    title="Share"
                    onClick={() => navigator.share?.({ title: currentSong.name, url: currentSong.url || window.location.href })}
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>

              <div className="np-divider" />

              {/* About the Artist */}
              <div className="np-about-section">
                <h2 className="np-section-title">About the artist</h2>

                {artistLoading ? (
                  <div className="np-artist-skeleton">
                    <div className="skeleton-img" />
                    <div className="skeleton-lines">
                      <div className="skeleton-line w60" />
                      <div className="skeleton-line w40" />
                    </div>
                  </div>
                ) : (
                  <div className="np-artist-card">
                    {/* Artist banner */}
                    <div className="np-artist-hero">
                      <img src={artistImage} alt="" className="np-artist-hero-img" />
                      <div className="np-artist-hero-overlay" />
                      <p className="np-artist-name-overlay">{currentSong.primaryArtists.split(',')[0]}</p>
                    </div>

                    <div className="np-artist-body">
                      <div className="np-artist-row">
                        <div>
                          <p className="np-artist-name">{currentSong.primaryArtists.split(',')[0]}</p>
                          {listeners && (
                            <p className="np-listeners">
                              {listeners} monthly listeners
                            </p>
                          )}
                        </div>
                        <button className="np-follow-btn">Follow</button>
                      </div>

                      {bio && (
                        <p className="np-bio">{bio.replace(/<[^>]+>/g, '').substring(0, 200)}…</p>
                      )}

                      {artistInfo?.urls && (
                        <div className="np-social-links">
                          {Object.entries(artistInfo.urls).map(([platform, url]) =>
                            url ? (
                              <a key={platform} href={url as string} target="_blank" rel="noreferrer" className="np-social-chip">
                                <ExternalLink size={12} />{platform}
                              </a>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Song details */}
              <div className="np-divider" />
              <div className="np-details-section">
                <h2 className="np-section-title">Song details</h2>
                <div className="np-detail-grid">
                  {currentSong.language && (
                    <div className="np-detail-item">
                      <span className="nd-label">Language</span>
                      <span className="nd-value">{currentSong.language.charAt(0).toUpperCase() + currentSong.language.slice(1)}</span>
                    </div>
                  )}
                  {currentSong.label && (
                    <div className="np-detail-item">
                      <span className="nd-label">Label</span>
                      <span className="nd-value">{currentSong.label}</span>
                    </div>
                  )}
                  {currentSong.releaseDate && (
                    <div className="np-detail-item">
                      <span className="nd-label">Released</span>
                      <span className="nd-value">{currentSong.releaseDate}</span>
                    </div>
                  )}
                  {currentSong.playCount > 0 && (
                    <div className="np-detail-item">
                      <span className="nd-label">Plays</span>
                      <span className="nd-value">{Number(currentSong.playCount).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: 120 }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
