import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { AlertTriangle, RefreshCw, Compass } from 'lucide-react';

export const IncompletePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const outcome = location.state?.outcome;

  const [isRetaking, setIsRetaking] = useState(false);

  const handleRetake = async () => {
    setIsRetaking(true);
    try {
      await api.startOrResumeAttempt();
      navigate('/assessment');
    } catch {
      navigate('/instructions');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '2rem auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: '#fef3c7', borderRadius: '50%', color: '#d97706', marginBottom: '1.25rem' }}>
          <AlertTriangle size={40} />
        </div>

        <h1 className="card-title" style={{ fontSize: '1.75rem' }}>Almost There!</h1>
        <p className="card-subtitle" style={{ fontSize: '1.05rem', marginBottom: '1.5rem' }}>
          {outcome?.message ||
            'To generate an accurate and reliable learning profile, MindBridge needs at least 15 completed responses.'}
        </p>

        {outcome && (
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#4f46e5' }}>{outcome.answered_count}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Answered</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{outcome.timed_out_count}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Timed Out</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>15</div>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Required</div>
            </div>
          </div>
        )}

        <p style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '2rem' }}>
          Don't worry! You can start a new attempt right now. Take your time to read each question, and tap your favorite answer before the timer runs out.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleRetake}
            disabled={isRetaking}
          >
            <RefreshCw size={20} />
            <span>{isRetaking ? 'Starting attempt...' : 'Retake Assessment'}</span>
          </button>
          <Link to="/instructions" className="btn btn-secondary btn-lg">
            <Compass size={20} />
            <span>Read Instructions</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
