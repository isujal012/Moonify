import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CheckCircle, AlertTriangle, Bug, Lightbulb, HelpCircle, MessageSquare } from 'lucide-react';
import { auth, db } from '../../services/firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAtom } from 'jotai';
import { userProfileAtom } from '../../store/atoms';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'bug', label: 'Bug Report', icon: Bug, color: '#ff5555' },
  { id: 'feature', label: 'Feature Request', icon: Lightbulb, color: '#ffd700' },
  { id: 'question', label: 'Question', icon: HelpCircle, color: '#00d2ff' },
  { id: 'feedback', label: 'General Feedback', icon: MessageSquare, color: '#69f0ae' },
  { id: 'other', label: 'Other', icon: AlertTriangle, color: '#b388ff' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#69f0ae' },
  { id: 'medium', label: 'Medium', color: '#ffd700' },
  { id: 'high', label: 'High', color: '#ff8a65' },
  { id: 'critical', label: 'Critical', color: '#ff5555' },
];

export function SupportModal({ open, onClose }: SupportModalProps) {
  const [profile] = useAtom(userProfileAtom);
  const user = auth.currentUser;

  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');

  const resetForm = () => {
    setCategory('');
    setPriority('medium');
    setSubject('');
    setDescription('');
    setError('');
    setSubmitted(false);
    setTicketId('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject');
      return;
    }
    if (!description.trim()) {
      setError('Please describe your issue');
      return;
    }

    setLoading(true);
    try {
      const ticket = {
        userId: user?.uid || 'anonymous',
        userEmail: user?.email || 'unknown',
        userHandle: profile?.handle || user?.displayName || 'traveler',
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };

      const docRef = await addDoc(collection(db, 'support_tickets'), ticket);
      setTicketId(docRef.id.slice(-8).toUpperCase());
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;


  return (
    <AnimatePresence>
      <motion.div
        className="support-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="support-modal"
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          <button className="support-close" onClick={handleClose}>
            <X size={20} />
          </button>

          {submitted ? (
            /* ── Success Screen ── */
            <motion.div 
              className="support-success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="success-icon-wrap">
                <CheckCircle size={48} />
              </div>
              <h2>Ticket Submitted!</h2>
              <p className="success-subtitle">We've received your request and will get back to you soon.</p>
              
              <div className="ticket-id-card">
                <span className="ticket-label">Ticket ID</span>
                <span className="ticket-code">#{ticketId}</span>
              </div>

              <p className="success-note">Save this ID for future reference</p>

              <button className="support-done-btn" onClick={handleClose}>
                Done
              </button>
            </motion.div>
          ) : (
            /* ── Form ── */
            <>
              <div className="support-header">
                <div className="support-header-icon">
                  <MessageSquare size={22} />
                </div>
                <h2>Raise a Ticket</h2>
                <p>We're here to help. Describe your issue below.</p>
              </div>

              <form className="support-form" onSubmit={handleSubmit}>
                {/* Category Selection */}
                <div className="form-field">
                  <label className="form-label">Category</label>
                  <div className="category-grid">
                    {CATEGORIES.map(cat => {
                      const Icon = cat.icon;
                      const isActive = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`category-chip ${isActive ? 'active' : ''}`}
                          style={{ 
                            '--chip-color': cat.color,
                            borderColor: isActive ? cat.color : undefined
                          } as React.CSSProperties}
                          onClick={() => setCategory(cat.id)}
                        >
                          <Icon size={14} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div className="form-field">
                  <label className="form-label">Priority</label>
                  <div className="priority-row">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`priority-btn ${priority === p.id ? 'active' : ''}`}
                        style={{ '--pri-color': p.color } as React.CSSProperties}
                        onClick={() => setPriority(p.id)}
                      >
                        <span className="pri-dot" style={{ background: p.color }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subject */}
                <div className="form-field">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="support-input"
                    placeholder="Brief summary of your issue"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={120}
                  />
                  <span className="char-count">{subject.length}/120</span>
                </div>

                {/* Description */}
                <div className="form-field">
                  <label className="form-label">Description</label>
                  <textarea
                    className="support-textarea"
                    placeholder="Please describe your issue in detail. Include steps to reproduce if reporting a bug..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    maxLength={2000}
                  />
                  <span className="char-count">{description.length}/2000</span>
                </div>

                {error && (
                  <div className="support-error">
                    <AlertTriangle size={14} />
                    {error}
                  </div>
                )}

                <button type="submit" className="support-submit-btn" disabled={loading}>
                  {loading ? (
                    <span className="support-spinner" />
                  ) : (
                    <>
                      <Send size={16} />
                      Submit Ticket
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>

      <style>{`
        .support-overlay {
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

        .support-modal {
          width: 92%;
          max-width: 500px;
          max-height: 88vh;
          overflow-y: auto;
          background: rgba(16, 16, 24, 0.97);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 36px 32px 32px;
          position: relative;
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5),
                      0 0 1px rgba(255, 255, 255, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }

        .support-close {
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
        .support-close:hover {
          background: rgba(255, 255, 255, 0.12);
          color: white;
        }

        /* Header */
        .support-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .support-header-icon {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          background: linear-gradient(135deg, var(--accent-glow), #7C3AED);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          color: white;
          box-shadow: 0 4px 20px rgba(0, 210, 255, 0.25);
        }
        .support-header h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
        }
        .support-header p {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.4);
        }

        /* Form */
        .support-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
        }
        .form-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.45);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        /* Category chips */
        .category-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .category-chip {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .category-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }
        .category-chip.active {
          background: color-mix(in srgb, var(--chip-color) 15%, transparent);
          color: var(--chip-color);
          border-color: var(--chip-color);
          box-shadow: 0 0 12px color-mix(in srgb, var(--chip-color) 20%, transparent);
        }

        /* Priority */
        .priority-row {
          display: flex;
          gap: 6px;
        }
        .priority-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 8px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.55);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .priority-btn:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .priority-btn.active {
          background: color-mix(in srgb, var(--pri-color) 12%, transparent);
          border-color: var(--pri-color);
          color: var(--pri-color);
        }
        .pri-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Input & Textarea */
        .support-input,
        .support-textarea {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-size: 0.88rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .support-textarea {
          resize: vertical;
          min-height: 100px;
          line-height: 1.5;
        }
        .support-input:focus,
        .support-textarea:focus {
          border-color: var(--accent-glow);
          box-shadow: 0 0 0 3px rgba(0, 210, 255, 0.1);
        }
        .support-input::placeholder,
        .support-textarea::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
        .char-count {
          position: absolute;
          bottom: 12px;
          right: 14px;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.2);
          pointer-events: none;
        }

        /* Error */
        .support-error {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #ff5555;
          font-size: 0.82rem;
          padding: 10px 14px;
          background: rgba(255, 85, 85, 0.08);
          border-radius: 8px;
          border: 1px solid rgba(255, 85, 85, 0.2);
        }

        /* Submit */
        .support-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, var(--accent-glow), #7C3AED);
          border: none;
          border-radius: 12px;
          color: white;
          font-size: 0.92rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          font-family: 'Outfit', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .support-submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 24px rgba(0, 210, 255, 0.35);
          transform: translateY(-1px);
        }
        .support-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .support-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: supportSpin 0.6s linear infinite;
        }
        @keyframes supportSpin {
          to { transform: rotate(360deg); }
        }

        /* ── Success Screen ── */
        .support-success {
          text-align: center;
          padding: 20px 0;
        }
        .success-icon-wrap {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(105, 240, 174, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #69f0ae;
          animation: successPulse 2s ease-in-out infinite;
        }
        @keyframes successPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(105, 240, 174, 0.2); }
          50% { box-shadow: 0 0 0 12px rgba(105, 240, 174, 0); }
        }
        .support-success h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1.4rem;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
        }
        .success-subtitle {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 24px;
          line-height: 1.4;
        }
        .ticket-id-card {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 18px 24px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          margin: 0 auto 12px;
          max-width: 220px;
        }
        .ticket-label {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.35);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
        }
        .ticket-code {
          font-family: 'Space Grotesk', monospace;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--accent-glow);
          text-shadow: 0 0 10px rgba(0, 210, 255, 0.3);
          letter-spacing: 2px;
        }
        .success-note {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.3);
          margin-bottom: 24px;
        }
        .support-done-btn {
          padding: 14px 40px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          color: white;
          font-size: 0.92rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .support-done-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: var(--accent-glow);
        }

        /* Scrollbar */
        .support-modal::-webkit-scrollbar { width: 4px; }
        .support-modal::-webkit-scrollbar-track { background: transparent; }
        .support-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </AnimatePresence>
  );
}
