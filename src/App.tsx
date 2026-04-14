import { useAtom } from 'jotai';
import { GalaxyScene } from './components/Three/GalaxyScene';
import { Player } from './components/UI/Player';
import { Dashboard } from './components/UI/Dashboard';
import { Search } from './components/UI/Search';
import { Auth } from './components/UI/Auth';
import { SplashScreen } from './components/UI/SplashScreen';
import { BackgroundMusic } from './components/UI/BackgroundMusic';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { BabeAssistant } from './components/UI/BabeAssistant';
import { ProfileModal } from './components/UI/ProfileModal';
import { SupportModal } from './components/UI/SupportModal';
import { userAtom, userProfileAtom, isSearchOpenAtom, isDashboardOpenAtom } from './store/atoms';
import { useEffect, useState, useRef } from 'react';
import { auth, db } from './services/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Search as SearchIcon, Eye, EyeOff, ExternalLink, Home, ListMusic } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';

function App() {
  const [user, setUser] = useAtom(userAtom);
  const [profile, setProfile] = useAtom(userProfileAtom);
  const [showSplash, setShowSplash] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useAtom(isSearchOpenAtom);
  const [isDashOpen, setIsDashOpen] = useAtom(isDashboardOpenAtom);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [privateSession, setPrivateSession] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const profileSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as any);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    setShowUserMenu(false);
    auth.signOut();
  };

  const displayName = profile?.handle || user?.displayName || 'Traveler';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="app-container" style={{ background: 'transparent' }}>
      <ErrorBoundary>
        <GalaxyScene />
      </ErrorBoundary>
      
      {/* Moved to top level for stability */}
      <BackgroundMusic />
      
      <header className="main-header">
        <div className="logo-group">
          <h1 className="logo">Moon<span>ify</span></h1>
          <p className="subtitle">Music Player</p>
        </div>
        
        <div className="user-section">
          {user && (
            <div className="header-actions">
              <button 
                onClick={() => setIsDashOpen(!isDashOpen)} 
                className={`header-icon-btn ${isDashOpen ? 'active' : ''}`}
                title={isDashOpen ? "Cinematic Mode" : "Show Interface"}
              >
                {isDashOpen ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
              <button 
                onClick={() => setIsSearchOpen(true)} 
                className="header-icon-btn"
                title="Search Galaxy"
              >
                <SearchIcon size={18} />
              </button>

              {/* User Avatar Button + Dropdown */}
              <div className="user-menu-container" ref={menuRef}>
                <button 
                  className={`user-avatar-btn ${showUserMenu ? 'menu-open' : ''}`}
                  onClick={() => setShowUserMenu(prev => !prev)}
                  title="User menu"
                >
                  <span className="avatar-circle">{initial}</span>
                  <span className="avatar-name">{displayName}</span>
                </button>

                {showUserMenu && (
                  <div className="user-dropdown-menu" onClick={e => e.stopPropagation()}>
                    <button className="dropdown-item" onClick={() => { setShowUserMenu(false); setShowProfile(true); }}>
                      <span className="dropdown-label">Profile</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowUserMenu(false); setIsDashOpen(true); }}>
                      <span className="dropdown-label">Recents</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowUserMenu(false); setShowSupport(true); }}>
                      <span className="dropdown-label">Support</span>
                      <ExternalLink size={14} className="dropdown-ext" />
                    </button>

                    <div className="dropdown-divider" />

                    <button 
                      className={`dropdown-item ${privateSession ? 'toggle-active' : ''}`} 
                      onClick={() => setPrivateSession(p => !p)}
                    >
                      <span className="dropdown-label">Private session</span>
                      <div className={`toggle-switch ${privateSession ? 'on' : ''}`}>
                        <div className="toggle-knob" />
                      </div>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowUserMenu(false); }}>
                      <span className="dropdown-label">Settings</span>
                    </button>

                    <div className="dropdown-divider" />

                    <button className="dropdown-item logout" onClick={handleLogout}>
                      <span className="dropdown-label">Log out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {user && isDashOpen && <Dashboard />}
      </AnimatePresence>
      
      <Search />
      <Player />
      {user && <BabeAssistant />}
      {user && <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />}
      {user && <SupportModal open={showSupport} onClose={() => setShowSupport(false)} />}

      {/* Global Mobile Bottom Nav */}
      {user && isDashOpen && (
        <div className="mobile-bottom-nav mobile-only">
          <button 
            className={`m-nav-btn ${!isSearchOpen ? 'active' : ''}`}
            onClick={() => { setIsSearchOpen(false); }}
          >
            <Home size={24} />
            <span>Home</span>
          </button>
          
          <button 
            className={`m-nav-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => { setIsSearchOpen(true); }}
          >
            <SearchIcon size={24} />
            <span>Search</span>
          </button>

          <button 
            className="m-nav-btn"
            onClick={() => {
              // Trigger Your Library / Playlists popup
              const el = document.querySelector('.spotify-list-item');
              if (el) (el as HTMLElement).click();
            }}
          >
            <ListMusic size={24} />
            <span>Library</span>
          </button>
        </div>
      )}

      <style>{`
        .mobile-bottom-nav {
          display: none !important;
        }

        @media (max-width: 768px) {
          .mobile-bottom-nav {
            position: fixed;
            bottom: 0 !important;
            left: 0;
            right: 0;
            height: 68px;
            background: linear-gradient(180deg, rgba(10, 10, 15, 0.95) 0%, rgba(5, 5, 8, 1) 100%);
            backdrop-filter: blur(25px);
            border-top: 1px solid rgba(255,255,255,0.08);
            z-index: 5000; /* Absolute Top */
            display: flex !important;
            align-items: center;
            justify-content: space-around;
            padding: 0 15px;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
          }
          .m-nav-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            background: none;
            border: none;
            color: rgba(255,255,255,0.4);
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 5px 12px;
            border-radius: 12px;
          }
          .m-nav-btn span { 
            font-size: 0.65rem; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 1px; 
            opacity: 0.8;
            font-family: 'Space Grotesk', sans-serif !important;
          }
          .m-nav-btn.active { 
            color: #fff;
          }
          .m-nav-btn.active span { opacity: 1; color: var(--accent-glow); }
          .m-nav-btn:active { transform: scale(0.92); }
        }
      `}</style>

      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {!user && !showSplash && (
        <div className="centered-auth-overlay">
          <Auth onClose={() => {}} />
        </div>
      )}

      <style>{`
        .header-icon-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0.6;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
        }
        .header-icon-btn:hover, .header-icon-btn.active {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
          color: var(--accent-glow);
        }

        .centered-auth-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          pointer-events: none;
        }
        .centered-auth-overlay > * {
          pointer-events: all;
        }

        .app-container {
          height: 100vh;
          width: 100vw;
          position: relative;
        }
        .main-header {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          padding: 20px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 50;
          pointer-events: none;
        }
        @media (max-width: 768px) {
          .main-header { padding: 15px 20px; }
          .main-header .logo { font-size: 1.6rem !important; }
          .main-header .subtitle { display: none; }
        }
        .logo {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          letter-spacing: -1px;
          pointer-events: all;
        }
        .logo span {
          color: var(--accent-glow);
          text-shadow: 0 0 10px var(--accent-glow);
        }
        .logo-group {
          display: flex;
          flex-direction: column;
        }
        .main-header .logo {
          font-size: 2.5rem;
          margin-bottom: -5px;
        }
        .main-header .subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-left: 4px;
          font-family: 'Space Grotesk', sans-serif;
        }
        .user-section {
          pointer-events: all;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* ── User Avatar Button ── */
        .user-menu-container {
          position: relative;
        }
        .user-avatar-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(40, 40, 40, 0.85);
          border: none;
          border-radius: 30px;
          padding: 4px 14px 4px 4px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .user-avatar-btn:hover,
        .user-avatar-btn.menu-open {
          background: rgba(60, 60, 60, 0.95);
        }
        .avatar-circle {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: var(--accent-glow);
          color: #000;
          font-weight: 700;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: 'Space Grotesk', sans-serif;
        }
        .avatar-name {
          color: white;
          font-weight: 600;
          font-size: 0.85rem;
          white-space: nowrap;
          font-family: 'Space Grotesk', sans-serif;
        }
        @media (max-width: 768px) {
          .avatar-name { display: none; }
          .user-avatar-btn { padding: 4px; }
        }

        /* ── Dropdown Menu ── */
        .user-dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 210px;
          background: rgba(22, 22, 30, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.04);
          padding: 4px 0;
          z-index: 300;
          animation: menuSlideIn 0.18s ease-out;
        }
        @keyframes menuSlideIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 16px;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.88rem;
          font-weight: 400;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s, color 0.12s;
          font-family: 'Outfit', sans-serif;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
        .dropdown-item.logout:hover {
          color: #ff5555;
        }
        .dropdown-label { flex: 1; }
        .dropdown-ext {
          opacity: 0.4;
          flex-shrink: 0;
        }
        .dropdown-item:hover .dropdown-ext {
          opacity: 0.7;
        }

        .dropdown-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
          margin: 4px 0;
        }

        /* ── Toggle Switch ── */
        .toggle-switch {
          width: 32px;
          height: 18px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          position: relative;
          flex-shrink: 0;
          transition: background 0.25s;
        }
        .toggle-switch.on {
          background: var(--accent-glow);
        }
        .toggle-knob {
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .toggle-switch.on .toggle-knob {
          transform: translateX(14px);
        }

        .planet-label {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(5px);
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .planet-label.visible, .planet-label.active {
          opacity: 1;
        }
        .planet-label .song-name {
          font-weight: 700;
          font-size: 0.8rem;
        }
        .planet-label .artist-name {
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.7);
        }
      `}</style>
    </div>
  );
}

export default App;
