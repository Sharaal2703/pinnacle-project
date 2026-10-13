import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ProfileChart } from '../components/ProfileChart';
import type { PreferenceProfile } from '@pinnacle/shared';
import { Award, Compass, RefreshCw, History, AlertCircle, Info, Sparkles } from 'lucide-react';

const PATHWAY_DESCRIPTIONS: Record<string, string> = {
  LING: 'Enjoys explanations, stories, reading, vocabulary, and expressing concepts in words.',
  LOGI: 'Excels when reasoning through puzzles, cause-and-effect relationships, and structured problems.',
  SPAT: 'Understands ideas faster with diagrams, maps, spatial models, and visual representations.',
  MUSI: 'Connects with rhythms, tunes, audio mnemonics, and sound patterns to retain information.',
  BODY: 'Prefers hands-on building, movement, physical models, and interactive simulation tasks.',
  NATU: 'Engages deeply with classification, environmental examples, living systems, and nature.'
};

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PreferenceProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetaking, setIsRetaking] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getCurrentProfile();
      setProfile(data);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
        navigate('/instructions');
        return;
      }
      setError(err?.message || 'Could not load preference profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = async () => {
    setIsRetaking(true);
    try {
      await api.startOrResumeAttempt();
      navigate('/assessment');
    } catch (err: any) {
      setError(err?.message || 'Could not initiate retake.');
      setIsRetaking(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={40} style={{ color: '#4f46e5', marginBottom: '1rem' }} />
        <h2>Generating your preference profile...</h2>
        <p style={{ color: '#64748b' }}>Calculating pathway scores</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
        <h2>No Profile Available</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error || 'You have not completed an assessment attempt yet.'}</p>
        <Link to="/instructions" className="btn btn-primary">
          <Compass size={18} />
          <span>Go to Assessment</span>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Summary */}
      <div className="profile-hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.2)', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem' }}>
          <Sparkles size={16} />
          <span>Indicative Learning Preference Profile</span>
        </div>

        <h1>Your Learning Preferences</h1>
        <p style={{ fontSize: '1.1rem', maxWidth: '700px', opacity: 0.95 }}>
          Based on your choices, we have identified your primary and secondary pathways to help guide how lessons are presented in Module 2!
        </p>

        {profile.near_tie && (
          <div style={{ marginTop: '1.25rem', background: 'rgba(245, 158, 11, 0.25)', border: '1.5px solid #fef08a', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Info size={22} style={{ color: '#fef08a', flexShrink: 0 }} />
            <div>
              <strong>Blended / Similar Preferences:</strong> Your top two pathways have very close scores (within 5 points), indicating you learn equally well through both representations!
            </div>
          </div>
        )}
      </div>

      {/* Top Pathways Cards */}
      <div className="pathway-cards-grid">
        <div className="pathway-card primary">
          <div className="pathway-card-header">
            <span className="badge-tag primary">Primary Pathway</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#4f46e5' }}>
              {profile.dominant.score_0_100 != null ? `${Math.round(profile.dominant.score_0_100)}%` : ''}
            </span>
          </div>
          <div className="pathway-name">{profile.dominant.name}</div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {PATHWAY_DESCRIPTIONS[profile.dominant.code] || 'Primary learning preference.'}
          </p>
        </div>

        <div className="pathway-card secondary">
          <div className="pathway-card-header">
            <span className="badge-tag secondary">Secondary Pathway</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#06b6d4' }}>
              {profile.secondary.score_0_100 != null ? `${Math.round(profile.secondary.score_0_100)}%` : ''}
            </span>
          </div>
          <div className="pathway-name">{profile.secondary.name}</div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {PATHWAY_DESCRIPTIONS[profile.secondary.code] || 'Secondary learning preference.'}
          </p>
        </div>
      </div>

      {/* Profile Chart & Full Breakdown */}
      <ProfileChart scores={profile.scores} />

      {/* Conceptual Framing / Scientific Integrity Disclaimer */}
      <div className="disclaimer-box" style={{ marginBottom: '2rem' }}>
        <strong>Important Note on Learning Profiles:</strong> MindBridge uses this profile to recommend engaging study formats (such as animations, stories, puzzles, or hands-on activities). It reflects your current learning preference choices; it is not a clinical or psychological intelligence diagnosis, nor a label of fixed ability.
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <Link to="/history" className="btn btn-secondary">
          <History size={18} />
          <span>View Profile History</span>
        </Link>

        <button
          type="button"
          className="btn btn-outline"
          onClick={handleRetake}
          disabled={isRetaking}
        >
          <RefreshCw size={18} />
          <span>{isRetaking ? 'Setting up new attempt...' : 'Retake Assessment'}</span>
        </button>
      </div>
    </div>
  );
};
