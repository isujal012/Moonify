import { useState } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Eye, EyeOff, Check, AlertCircle, User, Mail, Calendar, Shield } from 'lucide-react';
import { auth } from '../../services/firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { userProfileAtom } from '../../store/atoms';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const [profile] = useAtom(userProfileAtom);
  const user = auth.currentUser;

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPwError('');
    setPwSuccess('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    if (currentPassword === newPassword) {
      setPwError('New password must be different from current');
      return;
    }

    setPwLoading(true);
    try {
      if (!user || !user.email) throw new Error('No user logged in');
      
      // Re-authenticate first
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      setPwSuccess('Password updated successfully!');
      resetPasswordFields();
      setShowPasswordSection(false);
      
      // Auto-clear success after 3s
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setPwError('Current password is incorrect');
      } else if (err.code === 'auth/weak-password') {
        setPwError('Password is too weak. Use at least 6 characters');
      } else if (err.code === 'auth/too-many-requests') {
        setPwError('Too many attempts. Please try again later');
      } else {
        setPwError(err.message || 'Failed to update password');
      }
    } finally {
      setPwLoading(false);
    }
  };

  const handleClose = () => {
    resetPasswordFields();
    setShowPasswordSection(false);
    onClose();
  };

  if (!open) return null;

  const displayName = profile?.handle || user?.displayName || 'Traveler';
  const email = user?.email || 'unknown';
  const initial = displayName.charAt(0).toUpperCase();
  
  // Safe access for type safety
  const profileData = profile as any;
  const createdAt = profileData?.createdAt 
    ? new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) 
    : 'Unknown';
  
  const provider = user?.providerData?.[0]?.providerId === 'password' ? 'Email & Password' : user?.providerData?.[0]?.providerId || 'Unknown';

  return (
    <AnimatePresence>
      <motion.div
        className="profile-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="profile-modal"
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button className="profile-close-btn" onClick={handleClose}>
            <X size={20} />
          </button>

          {/* Header */}
          <div className="profile-header">
            <div className="profile-avatar-large">
              {initial}
            </div>
            <h2 className="profile-display-name">{displayName}</h2>
            <p className="profile-email">{email}</p>
          </div>

          {/* Info Section */}
          <div className="profile-info-grid">
            <div className="profile-info-item">
              <User size={16} />
              <div className="info-detail">
                <span className="info-label">Handle</span>
                <span className="info-value">@{profile?.handle || 'traveler'}</span>
              </div>
            </div>
            <div className="profile-info-item">
              <Mail size={16} />
              <div className="info-detail">
                <span className="info-label">Email</span>
                <span className="info-value">{email}</span>
              </div>
            </div>
            <div className="profile-info-item">
              <Calendar size={16} />
              <div className="info-detail">
                <span className="info-label">Member since</span>
                <span className="info-value">{createdAt}</span>
              </div>
            </div>
            <div className="profile-info-item">
              <Shield size={16} />
              <div className="info-detail">
                <span className="info-label">Sign-in method</span>
                <span className="info-value">{provider}</span>
              </div>
            </div>
          </div>

          {/* Success toast */}
          {pwSuccess && (
            <div className="pw-success-toast">
              <Check size={16} />
              {pwSuccess}
            </div>
          )}

          {/* Password Change Section */}
          <div className="profile-section-divider" />

          {!showPasswordSection ? (
            <button 
              className="profile-change-pw-btn"
              onClick={() => { setShowPasswordSection(true); setPwError(''); setPwSuccess(''); }}
            >
              <Lock size={16} />
              Change Password
            </button>
          ) : (
            <motion.form
              className="pw-change-form"
              onSubmit={handleChangePassword}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              <h3 className="pw-form-title">
                <Lock size={16} />
                Change Password
              </h3>

              <div className="pw-input-group">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="pw-eye-btn" onClick={() => setShowCurrentPw(p => !p)}>
                  {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="pw-input-group">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button type="button" className="pw-eye-btn" onClick={() => setShowNewPw(p => !p)}>
                  {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="pw-input-group">
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <button type="button" className="pw-eye-btn" onClick={() => setShowConfirmPw(p => !p)}>
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {pwError && (
                <div className="pw-error-msg">
                  <AlertCircle size={14} />
                  {pwError}
                </div>
              )}

              <div className="pw-form-actions">
                <button 
                  type="button" 
                  className="pw-cancel-btn" 
                  onClick={() => { setShowPasswordSection(false); resetPasswordFields(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="pw-submit-btn" disabled={pwLoading}>
                  {pwLoading ? (
                    <span className="pw-spinner" />
                  ) : (
                    'Update Password'
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </motion.div>

      <style>{`
        .profile-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
        }

        .profile-modal {
          width: 90%;
          max-width: 440px;
          max-height: 85vh;
          overflow-y: auto;
          background: rgba(16, 16, 24, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 40px 32px 32px;
          position: relative;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5), 
                      0 0 1px rgba(255, 255, 255, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .profile-close-btn {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .profile-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: white;
        }

        /* Header */
        .profile-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .profile-avatar-large {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-glow), #7C3AED);
          color: white;
          font-weight: 700;
          font-size: 1.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-family: 'Space Grotesk', sans-serif;
          box-shadow: 0 4px 24px rgba(0, 210, 255, 0.3);
        }
        .profile-display-name {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }
        .profile-email {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Info Grid */
        .profile-info-grid {
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .profile-info-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 18px;
          color: rgba(255, 255, 255, 0.5);
          transition: background 0.15s;
        }
        .profile-info-item:hover {
          background: rgba(255, 255, 255, 0.04);
        }
        .info-detail {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .info-label {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.35);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .info-value {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-section-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.07);
          margin: 20px 0;
        }

        /* Change Password Button */
        .profile-change-pw-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .profile-change-pw-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--accent-glow);
          color: white;
          box-shadow: 0 0 20px rgba(0, 210, 255, 0.15);
        }

        /* Password Change Form */
        .pw-change-form {
          overflow: hidden;
        }
        .pw-form-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 16px;
        }

        .pw-input-group {
          position: relative;
          margin-bottom: 12px;
        }
        .pw-input-group input {
          width: 100%;
          padding: 14px 44px 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .pw-input-group input:focus {
          border-color: var(--accent-glow);
          box-shadow: 0 0 0 3px rgba(0, 210, 255, 0.1);
        }
        .pw-input-group input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        .pw-eye-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.35);
          cursor: pointer;
          padding: 4px;
          display: flex;
          transition: color 0.15s;
        }
        .pw-eye-btn:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .pw-error-msg {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ff5555;
          font-size: 0.82rem;
          margin-bottom: 12px;
          padding: 10px 14px;
          background: rgba(255, 85, 85, 0.08);
          border-radius: 8px;
          border: 1px solid rgba(255, 85, 85, 0.2);
        }

        .pw-success-toast {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #69f0ae;
          font-size: 0.85rem;
          padding: 12px 16px;
          background: rgba(105, 240, 174, 0.08);
          border-radius: 10px;
          border: 1px solid rgba(105, 240, 174, 0.2);
          margin-top: 16px;
          animation: toastPop 0.3s ease;
        }
        @keyframes toastPop {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .pw-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
        }
        .pw-cancel-btn {
          flex: 1;
          padding: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .pw-cancel-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .pw-submit-btn {
          flex: 1.5;
          padding: 12px;
          background: linear-gradient(135deg, var(--accent-glow), #7C3AED);
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .pw-submit-btn:hover:not(:disabled) {
          box-shadow: 0 4px 20px rgba(0, 210, 255, 0.35);
          transform: translateY(-1px);
        }
        .pw-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .pw-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Scrollbar for modal */
        .profile-modal::-webkit-scrollbar { width: 4px; }
        .profile-modal::-webkit-scrollbar-track { background: transparent; }
        .profile-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </AnimatePresence>
  );
}
