import { useState } from 'react';
import { useAtom } from 'jotai';
import { auth, db } from '../../services/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { userAtom, userProfileAtom, isAuthModalOpenAtom } from '../../store/atoms';
import { Mail, Lock, AtSign, X, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSetAtom } from 'jotai';

export function Auth({ onClose }: { onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [, setUser] = useAtom(userAtom);
  const [, setProfile] = useAtom(userProfileAtom);
  const setIsAuthOpen = useSetAtom(isAuthModalOpenAtom);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!auth || !db) {
      setError('Firebase is not configured. Add VITE_FIREBASE_* keys to .env to enable sign in.');
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Fetch profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid));
        if (profileDoc.exists()) {
          setProfile(profileDoc.data() as any);
        }
        setUser(user);
        onClose();
      } else {
        // Signup
        if (!handle.trim()) throw new Error('Handle is required');

        // Check handle uniqueness
        const handleRef = doc(db, 'handles', handle.toLowerCase());
        const handleSnap = await getDoc(handleRef);
        if (handleSnap.exists()) throw new Error('Handle already taken');

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const profileData = {
          handle: handle.toLowerCase(),
          likedSongs: [],
          playlists: [],
          createdAt: new Date().toISOString()
        };

        // Create user doc and handle doc
        await setDoc(doc(db, 'users', user.uid), profileData);
        await setDoc(handleRef, { uid: user.uid });

        await updateProfile(user, { displayName: handle });

        setUser(user);
        setProfile(profileData);
        onClose();
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password. Please check your credentials.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err?.message || 'Authentication failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="auth-modalOverlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => { setIsAuthOpen(false); onClose(); }}
    >
      <motion.div
        className="auth-container glass"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={() => { setIsAuthOpen(false); onClose(); }}>
          <X size={20} />
        </button>

        <div className="auth-header">
          <h2>{isLogin ? 'Welcome Back Traveler' : 'Begin Your Journey'}</h2>
          <p>{isLogin ? 'Sign in to access your Moonify' : 'Create a profile to sync across worlds'}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="input-group">
              <AtSign size={18} />
              <input
                type="text"
                placeholder="Unique handle (e.g. Sujal Gupta)"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
              />
            </div>
          )}
          <div className="input-group">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <Lock size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pw-toggle-btn"
              onClick={() => setShowPassword(p => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p className="error-msg">{error}</p>}

          <button type="submit" className="futuristic-btn" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Enter Space' : 'Launch Profile')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "New to the Moonify?" : "Already have a coordinate?"}
            <span onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? ' Create Account' : ' Sign In'}
            </span>
          </p>
          
          <div className="legal-footer">
            <a href="/about.html" target="_blank" rel="noopener noreferrer">About</a>
            <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy</a>
            <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms</a>
            <a href="/contact.html" target="_blank" rel="noopener noreferrer">Contact</a>
          </div>
        </div>
      </motion.div>

      <style>{`
        .auth-modalOverlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(2, 2, 10, 0.78);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 16px;
        }
        .auth-container {
          width: 100%;
          max-width: 420px;
          padding: 36px 32px;
          position: relative;
          background: rgba(10, 12, 24, 0.92);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75);
          font-family: 'Outfit', 'Space Grotesk', sans-serif;
        }
        .close-btn {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background: rgba(255, 255, 255, 0.14);
          color: #fff;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 26px;
        }
        .auth-header h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.55rem;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 8px;
        }
        .auth-header p {
          font-family: 'Outfit', sans-serif;
          font-size: 0.92rem;
          color: rgba(240, 240, 245, 0.72);
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .input-group {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.07);
          padding: 12px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          color: rgba(255, 255, 255, 0.7);
          transition: border-color 0.2s, background 0.2s;
        }
        .input-group:focus-within {
          border-color: var(--accent-glow);
          background: rgba(255, 255, 255, 0.1);
        }
        .input-group input {
          background: transparent;
          border: none;
          color: #ffffff;
          font-size: 0.95rem;
          flex: 1;
          min-width: 0;
          outline: none;
        }
        .input-group input::placeholder {
          color: rgba(240, 240, 245, 0.45);
        }
        .input-group input:-webkit-autofill,
        .input-group input:-webkit-autofill:hover,
        .input-group input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0 1000px rgba(16, 20, 38, 0.98) inset;
          transition: background-color 5000s ease-in-out 0s;
        }
        .pw-toggle-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
        }
        .pw-toggle-btn:hover {
          color: #ffffff;
        }
        .error-msg {
          font-family: 'Outfit', sans-serif;
          color: #ff8080;
          background: rgba(255, 77, 77, 0.14);
          border: 1px solid rgba(255, 77, 77, 0.35);
          border-radius: 8px;
          padding: 9px 12px;
          font-size: 0.85rem;
          line-height: 1.4;
          text-align: center;
        }
        .futuristic-btn {
          width: 100%;
          margin-top: 6px;
          font-weight: 600;
        }
        .auth-footer {
          margin-top: 22px;
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          color: rgba(240, 240, 245, 0.72);
        }
        .auth-footer span {
          color: var(--accent-glow);
          cursor: pointer;
          font-weight: 600;
        }
        .legal-footer {
          margin-top: 18px;
          display: flex;
          justify-content: center;
          gap: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 14px;
        }
        .legal-footer a {
          font-family: 'Outfit', sans-serif;
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.78rem;
          text-decoration: none;
          transition: color 0.2s;
        }
        .legal-footer a:hover {
          color: var(--accent-glow);
        }
      `}</style>
    </motion.div>
  );
}
