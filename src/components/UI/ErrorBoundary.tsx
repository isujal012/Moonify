import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback glass">
          <h2>Cosmic Disturbance</h2>
          <p>The 3D engine encountered a pocket of turbulence. The music and search functions should still work.</p>
          <button onClick={() => window.location.reload()}>Re-Initialize Engine</button>
          <style>{`
            .error-fallback {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              padding: 40px;
              text-align: center;
              z-index: 200;
            }
            .error-fallback h2 { margin-bottom: 20px; color: var(--accent-glow); }
            .error-fallback button {
              margin-top: 20px;
              padding: 10px 20px;
              background: var(--accent-glow);
              border: none;
              color: white;
              border-radius: 5px;
              cursor: pointer;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
