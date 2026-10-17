import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import type { PreferenceProfileHistoryItem } from '@pinnacle/shared';
import { History, Award, Calendar, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';

export const ProfileHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<PreferenceProfileHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getProfileHistory();
      setHistory(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load profile history.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={40} style={{ color: '#4f46e5', marginBottom: '1rem' }} />
        <h2>Loading Profile History...</h2>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Assessment History</h1>
          <p style={{ color: '#64748b' }}>Every completed learning preference profile is safely archived here.</p>
        </div>
        <Link to="/result" className="btn btn-secondary">
          <Award size={18} />
          <span>Current Profile</span>
        </Link>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <History size={48} style={{ color: '#94a3b8', margin: '0 auto 1rem auto' }} />
          <h2>No History Recorded Yet</h2>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Complete your first learning preference assessment to build your profile!
          </p>
          <Link to="/instructions" className="btn btn-primary">
            <span>Take Assessment</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {history.map((item) => {
            const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={item.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  border: item.is_current ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  boxShadow: item.is_current ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.9rem' }}>
                    <Calendar size={16} />
                    <span>Completed on {formattedDate}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {item.is_current && (
                      <span className="badge-tag primary">Active Profile</span>
                    )}
                    {item.near_tie && (
                      <span className="badge-tag blended">Blended Preferences</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Primary Pathway
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.dominant.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {item.dominant.score_0_100 != null ? `${Math.round(item.dominant.score_0_100)}% score` : ''}
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Secondary Pathway
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{item.secondary.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {item.secondary.score_0_100 != null ? `${Math.round(item.secondary.score_0_100)}% score` : ''}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
