import { motion } from 'framer-motion';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div 
      className="splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1, ease: "easeInOut" }}
    >
      <div className="splash-content">
        <motion.div 
          className="splash-logo"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <h1 className="logo">Cosmic<span>Beats</span></h1>
          <motion.div 
            className="splash-loader"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: "easeInOut" }}
            onAnimationComplete={onComplete}
          />
        </motion.div>
        <motion.p 
          className="splash-subtitle"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Initializing interstellar frequencies...
        </motion.p>
      </div>

      <style>{`
        .splash-screen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #020205;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .splash-content {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .splash-logo {
          position: relative;
        }

        .splash-logo .logo {
          font-size: 4rem;
          margin-bottom: 10px;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          color: white;
        }

        .splash-logo .logo span {
          color: var(--accent-glow, #00d2ff);
          text-shadow: 0 0 20px var(--accent-glow, #00d2ff);
        }

        .splash-loader {
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent-glow, #00d2ff), transparent);
          box-shadow: 0 0 10px var(--accent-glow, #00d2ff);
        }

        .splash-subtitle {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 3px;
          text-transform: uppercase;
          font-family: 'Space Grotesk', sans-serif;
        }
      `}</style>
    </motion.div>
  );
}
