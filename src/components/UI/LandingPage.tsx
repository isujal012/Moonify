import { useSetAtom } from 'jotai';
import { isAuthModalOpenAtom } from '../../store/atoms';
import { motion } from 'framer-motion';
import { Play, Shield, Zap, Info, Mail } from 'lucide-react';

export function LandingPage() {
  const setIsAuthOpen = useSetAtom(isAuthModalOpenAtom);

  return (
    <div className="landing-page">
      <div className="landing-content">
        <motion.section 
          className="hero-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="hero-title">Elevate Your Music to <span className="gradient-text">New Galaxies</span></h1>
          <p className="hero-subtitle">
            Moonify is more than just a music player. It's an immersive 3D celestial experience designed for cosmic travelers who seek a cinematic atmosphere for their daily soundtrack.
          </p>
          <div className="hero-actions">
            <button className="primary-btn" onClick={() => setIsAuthOpen(true)}>
              <Play size={20} />
              <span>Enter Galaxy</span>
            </button>
            <a href="#features" className="secondary-btn">
              <span>Learn More</span>
            </a>
          </div>
        </motion.section>

        <section id="features" className="features-grid">
          <div className="feature-card glass">
            <div className="icon-box"><Zap size={24} /></div>
            <h3>Cinematic 3D Scenes</h3>
            <p>Experience your favorite tracks in a dynamic, high-fidelity 3D environment. Our proprietary galaxy engine renders celestial bodies that react to the rhythm and mood of your music.</p>
          </div>
          <div className="feature-card glass">
            <div className="icon-box"><Shield size={24} /></div>
            <h3>Babe AI Assistant</h3>
            <p>Meet Babe, your sophisticated cosmic companion. Navigate your library, search for new artists, and control your environment using advanced speech-to-intent technology.</p>
          </div>
          <div className="feature-card glass">
            <div className="icon-box"><Info size={24} /></div>
            <h3>Hi-Fi Audio Engineering</h3>
            <p>Our audio engine is optimized for clarity and depth. Enjoy lossless playback support and adaptive equalization that brings out the best in every recording.</p>
          </div>
        </section>

        <section className="manifesto-section">
          <h2>Why Moonify?</h2>
          <div className="manifesto-content">
            <p>
              In an era of cluttered interfaces and distracted listening, Moonify brings back the focus on the music. We've combined state-of-the-art WebGL technology with a minimalist design philosophy to create a player that feels alive.
            </p>
            <p>
              Whether you're working, studying, or just drifting through space, our procedural galaxy provides the perfect backdrop. No more static album covers; witness the birth of stars and the orbit of planets as your music unfolds.
            </p>
            <p>
              Join a community of thousands of listeners who have already discovered the future of music streaming. Moonify is built on modern web standards (React, Three.js, Firebase) to ensure a seamless experience across all your devices.
            </p>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="footer-links">
            <a href="/about.html">About Us</a>
            <a href="/privacy.html">Privacy Policy</a>
            <a href="/terms.html">Terms of Service</a>
            <a href="/contact.html">Support</a>
          </div>
          <p className="copyright">© 2026 Moonify. Built for the dreamers. <Mail size={12} style={{marginLeft: '10px'}} /> support@moonify.space</p>
        </footer>
      </div>

      <style>{`
        .landing-page {
          width: 100%;
          min-height: 100vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: transparent;
          scroll-behavior: smooth;
        }
        .landing-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 120px 20px 60px;
          display: flex;
          flex-direction: column;
          gap: 100px;
        }
        .hero-section {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }
        .hero-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 4rem;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 24px;
          color: #fff;
        }
        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, var(--accent-glow) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 0 30px rgba(88, 166, 255, 0.3);
        }
        .hero-subtitle {
          font-size: 1.4rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 40px;
          line-height: 1.5;
          font-family: 'Outfit', sans-serif;
        }
        .hero-actions {
          display: flex;
          justify-content: center;
          gap: 20px;
        }
        .primary-btn {
          background: var(--accent-glow);
          color: #000;
          border: none;
          padding: 16px 32px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.3s;
          box-shadow: 0 10px 40px rgba(88, 166, 255, 0.3);
        }
        .primary-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 50px rgba(88, 166, 255, 0.5);
        }
        .secondary-btn {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 16px 32px;
          border-radius: 50px;
          font-weight: 600;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s;
        }
        .secondary-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }
        .feature-card {
          padding: 40px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: transform 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-10px);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .icon-box {
          width: 50px;
          height: 50px;
          background: rgba(88, 166, 255, 0.1);
          color: var(--accent-glow);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }
        .feature-card h3 {
          font-size: 1.5rem;
          margin-bottom: 16px;
          color: #fff;
        }
        .feature-card p {
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .manifesto-section {
          text-align: center;
          padding: 80px 40px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 32px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .manifesto-section h2 {
          font-size: 2.5rem;
          margin-bottom: 40px;
          color: #fff;
        }
        .manifesto-content {
          max-width: 800px;
          margin: 0 auto;
          text-align: left;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .manifesto-content p {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
        }

        .landing-footer {
          margin-top: 50px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 40px;
          text-align: center;
        }
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-bottom: 24px;
        }
        .footer-links a {
          color: rgba(255, 255, 255, 0.4);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        .footer-links a:hover {
          color: var(--accent-glow);
        }
        .copyright {
          color: rgba(255, 255, 255, 0.2);
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 1024px) {
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
          .hero-title { font-size: 2.5rem; }
          .hero-subtitle { font-size: 1.1rem; }
          .features-grid { grid-template-columns: 1fr; }
          .landing-content { padding-top: 80px; gap: 60px; }
          .hero-actions { flex-direction: column; align-items: stretch; }
          .primary-btn { justify-content: center; }
          .secondary-btn { text-align: center; }
        }
      `}</style>
    </div>
  );
}
