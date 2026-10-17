import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MindBridge ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/instructions';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '2rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
            <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.4rem', color: '#1e293b', marginBottom: '0.75rem' }}>
              Something unexpected happened
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              We encountered a display issue while loading this page. You can refresh the view or return to the main dashboard.
            </p>
            {this.state.error && (
              <pre
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '1.5rem'
                }}
              >
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={this.handleReload}>
                <RefreshCw size={18} />
                <span>Reload Page</span>
              </button>
              <button type="button" className="btn btn-secondary" onClick={this.handleGoHome}>
                <Home size={18} />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
