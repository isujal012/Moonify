import { useAtom } from 'jotai';
import { playlistAtom, currentSongAtom, isPlayingAtom } from '../../store/atoms';
import { List, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export function PlaylistSidebar() {
  const [playlist, setPlaylist] = useAtom(playlistAtom);
  const [currentSong, setCurrentSong] = useAtom(currentSongAtom);
  const [, setIsPlaying] = useAtom(isPlayingAtom);
  const [isOpen, setIsOpen] = useState(false);

  const selectSong = (song: any) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const removeFromPlaylist = (id: string) => {
    setPlaylist(playlist.filter(s => s.id !== id));
  };

  return (
    <>
      {/* Trigger Edge */}
      <div 
        className="sidebar-trigger" 
        onMouseEnter={() => setIsOpen(true)}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="playlist-sidebar glass"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            onMouseLeave={() => setIsOpen(false)}
          >
            <div className="sidebar-header">
              <List size={20} />
              <h3>GALAXY QUEUE</h3>
            </div>

            <div className="sidebar-content">
              {playlist.length === 0 ? (
                <div className="empty-playlist">
                  <p>Your queue is empty</p>
                  <span>Search for songs to add them to your galaxy</span>
                </div>
              ) : (
                playlist.map((song) => (
                  <div 
                    key={song.id} 
                    className={`playlist-item ${currentSong?.id === song.id ? 'active' : ''}`}
                    onClick={() => selectSong(song)}
                  >
                    <img src={song.image?.[0]?.link} alt="" />
                    <div className="item-info">
                      <p className="item-name">{song.name}</p>
                      <p className="item-artist">{song.primaryArtists}</p>
                    </div>
                    <button 
                      className="delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromPlaylist(song.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .sidebar-trigger {
          position: fixed;
          top: 0;
          right: 0;
          width: 20px;
          height: 100vh;
          z-index: 140;
        }
        .playlist-sidebar {
          position: fixed;
          top: 0;
          right: 0;
          width: 320px;
          height: 100vh;
          z-index: 150;
          padding: 30px 20px;
          display: flex;
          flex-direction: column;
          border-radius: 0;
          border-left: 1px solid var(--glass-border);
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 25px;
          color: var(--accent-glow);
        }
        .sidebar-header h3 {
          font-family: 'Space Grotesk', sans-serif;
          letter-spacing: 2px;
          font-size: 1rem;
        }
        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .playlist-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }
        .playlist-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .playlist-item.active {
          background: rgba(0, 210, 255, 0.1);
          border-left: 3px solid var(--accent-glow);
        }
        .playlist-item img {
          width: 40px;
          height: 40px;
          border-radius: 4px;
        }
        .item-info .item-name {
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 180px;
        }
        .item-info .item-artist {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .delete-btn {
          position: absolute;
          right: 10px;
          opacity: 0;
          background: none;
          border: none;
          color: #ff4d4d;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .playlist-item:hover .delete-btn {
          opacity: 1;
        }
        .empty-playlist {
          text-align: center;
          margin-top: 50px;
          color: var(--text-secondary);
        }
        .empty-playlist p { font-size: 0.9rem; margin-bottom: 5px; }
        .empty-playlist span { font-size: 0.7rem; opacity: 0.6; }
      `}</style>
    </>
  );
}
