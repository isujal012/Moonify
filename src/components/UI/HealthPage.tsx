import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { isFirebaseConfigured } from '../../services/firebaseConfig';
import { musicService } from '../../services/musicService';

interface CheckState {
  status: 'checking' | 'ok' | 'degraded';
  latencyMs?: number;
}

export function HealthPage() {
  const [musicApi, setMusicApi] = useState<CheckState>({ status: 'checking' });
  const [lastChecked, setLastChecked] = useState<string>(new Date().toISOString());
  const [uptimeSeconds, setUptimeSeconds] = useState(0);

  const runChecks = async () => {
    setMusicApi({ status: 'checking' });
    const start = performance.now();
    try {
      const songs = await musicService.searchSongs('latest');
      const latencyMs = Math.round(performance.now() - start);
      setMusicApi({ status: songs.length > 0 ? 'ok' : 'degraded', latencyMs });
    } catch {
      setMusicApi({ status: 'degraded', latencyMs: Math.round(performance.now() - start) });
    }
    setLastChecked(new Date().toISOString());
  };

  useEffect(() => {
    runChecks();
    const uptimeTimer = setInterval(() => setUptimeSeconds(s => s + 1), 1000);
    const pollTimer = setInterval(runChecks, 30000);
    return () => {
      clearInterval(uptimeTimer);
      clearInterval(pollTimer);
    };
  }, []);

  return (
    <div className="health-page">
      <div className="health-card glass">
        <div className="health-header">
          <div className="health-title">
            <Activity size={24} color="#00d2ff" />
            <h1>Moonify System Health</h1>
          </div>
          <span className="health-badge ok">OPERATIONAL</span>
        </div>

        <div className="health-grid">
          <div className="health-row">
            <span>Frontend App</span>
            <span className="status-pill ok"><CheckCircle2 size={14} /> Online</span>
          </div>

          <div className="health-row">
            <span>Music Search API</span>
            <span className={`status-pill ${musicApi.status}`}>
              {musicApi.status === 'ok' && <CheckCircle2 size={14} />}
              {musicApi.status === 'degraded' && <AlertTriangle size={14} />}
              {musicApi.status === 'checking'
                ? 'Checking...'
                : `${musicApi.status === 'ok' ? 'Healthy' : 'Degraded'} (${musicApi.latencyMs}ms)`}
            </span>
          </div>

          <div className="health-row">
            <span>Firebase Auth &amp; Firestore</span>
            <span className={`status-pill ${isFirebaseConfigured ? 'ok' : 'degraded'}`}>
              {isFirebaseConfigured ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              {isFirebaseConfigured ? 'Configured' : 'Not Configured'}
            </span>
          </div>

          <div className="health-row">
            <span>Session Uptime</span>
            <span className="mono">{uptimeSeconds}s</span>
          </div>

          <div className="health-row">
            <span>Last Checked</span>
            <span className="mono">{new Date(lastChecked).toLocaleTimeString()}</span>
          </div>
        </div>

        <div className="health-actions">
          <button className="futuristic-btn" onClick={runChecks}>
            <RefreshCw size={14} /> Re-check
          </button>
          <a className="futuristic-btn" href="/">
            <ArrowLeft size={14} /> Back to Moonify
          </a>
        </div>
      </div>

      <style>{`
        .health-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(circle at top, #0b1026 0%, #020205 70%);
          color: #f0f0f5;
        }
        .health-card {
          width: 100%;
          max-width: 540px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .health-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .health-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .health-title h1 {
          font-size: 1.35rem;
          font-family: 'Space Grotesk', sans-serif;
        }
        .health-badge {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(105, 240, 174, 0.15);
          color: #69f0ae;
          border: 1px solid rgba(105, 240, 174, 0.4);
        }
        .health-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .health-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.9rem;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
        }
        .status-pill.ok { color: #69f0ae; }
        .status-pill.degraded { color: #ffd700; }
        .status-pill.checking { color: #00d2ff; }
        .mono {
          font-family: monospace;
          font-size: 0.82rem;
          opacity: 0.85;
        }
        .health-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .health-actions .futuristic-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}

