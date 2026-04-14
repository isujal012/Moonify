import { useState } from 'react';
import { useAtom } from 'jotai';
import { auth, db } from '../../services/firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { userAtom, userProfileAtom } from '../../store/atoms';
import { Mail, Lock, AtSign } from 'lucide-react';
import { motion } from 'framer-motion';

export function Auth({ onClose }: { onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [, setUser] = useAtom(userAtom);
  const [, setProfile] = useAtom(userProfileAtom);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      setError(err.message);
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
    >
      <motion.div
        className="auth-container glass"
        initial={{ y: 20 }}
        animate={{ y: 0 }}
      >

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
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
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
          background: transparent;
          backdrop-filter: none;
        }
        .auth-container {
          width: 90%;
          max-width: 400px;
          padding: 40px;
          position: relative;
          backdrop-filter: blur(2px); /* Very subtle blur for readability */
          background: rgba(0, 0, 0, 0.2); /* Darker but very thin */
        }
        .close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .auth-header h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.5rem;
          margin-bottom: 8px;
        }
        .auth-header p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }
        .input-group {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255, 255, 255, 0.05);
          padding: 12px 15px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .input-group input {
          background: none;
          border: none;
          color: white;
          flex: 1;
          outline: none;
        }
        .error-msg {
          color: #ff4d4d;
          font-size: 0.8rem;
          text-align: center;
        }
        .futuristic-btn {
          width: 100%;
          margin-top: 10px;
        }
        .auth-footer {
          margin-top: 25px;
          text-align: center;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
        .auth-footer span {
          color: var(--accent-glow);
          cursor: pointer;
          font-weight: 600;
        }
      `}</style>
    </motion.div>
  );
}
