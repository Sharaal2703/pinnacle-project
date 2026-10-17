import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ProfileChart } from '../components/ProfileChart';
import type { PreferenceProfile } from '@pinnacle/shared';
import { Award, Compass, RefreshCw, History, AlertCircle, Info, Sparkles, ArrowRight } from 'lucide-react';

const PATHWAY_DESCRIPTIONS: Record<string, string> = {
  LING: 'Enjoys explanations, stories, reading, vocabulary, and expressing concepts in words.',
  LOGI: 'Excels when reasoning through puzzles, cause-and-effect relationships, and structured problems.',
  SPAT: 'Understands ideas faster with diagrams, maps, spatial models, and visual representations.',
  MUSI: 'Connects with rhythms, tunes, audio mnemonics, and sound patterns to retain information.',
  BODY: 'Prefers hands-on building, movement, physical models, and interactive simulation tasks.',
  NATU: 'Engages deeply with classification, environmental examples, living systems, and nature.'
};

function convertOutcomeToProfile(outcome: any): PreferenceProfile | null {
  if (!outcome || !outcome.scores || outcome.status !== 'SCORED') return null;
  const dom = outcome.dominant || outcome.primary;
  const sec = outcome.secondary;
  if (!dom || !sec) return null;

  return {
    id: outcome.id || outcome.attempt_id,
    student_id: outcome.student_id || '',
    attempt_id: outcome.attempt_id,
    is_current: true,
    created_at: outcome.created_at || new Date().toISOString(),
    scoring_version: outcome.scoring_version || '1.0.0',
    near_tie: !!outcome.near_tie,
    dominant: dom,
    secondary: sec,
    scores: (outcome.scores || []).map((s: any) => ({
      ...s,
      raw_score: Number(s.raw_score ?? s.rawScore ?? 0),
      max_score: Number(s.max_score ?? s.maxScore ?? 0),
      score_0_100: s.score_0_100 != null ? Number(s.score_0_100) : (s.score0To100 != null ? Number(s.score0To100) : null)
    }))
  };
}

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const stateOutcome = (location.state as any)?.outcome;
  const initialProfile = convertOutcomeToProfile(stateOutcome);

  const [profile, setProfile] = useState<PreferenceProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProfile);
  const [error, setError] = useState<string | null>(null);
  const [isRetaking, setIsRetaking] = useState<boolean>(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.getCurrentProfile();
      const normalizedScores = (data.scores || []).map((s: any) => ({
        ...s,
        raw_score: Number(s.raw_score ?? s.rawScore ?? 0),
        max_score: Number(s.max_score ?? s.maxScore ?? 0),
        score_0_100: s.score_0_100 != null ? Number(s.score_0_100) : null
      }));
      setProfile({
        ...data,
        scores: normalizedScores
      });
      setError(null);
    } catch (err: any) {
      if (!initialProfile) {
        if (err instanceof ApiError && err.code === 'PROFILE_NOT_FOUND') {
          setError('PROFILE_NOT_FOUND');
        } else {
          setError(err?.message || 'Could not load preference profile.');
        }
      }
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

  if (isLoading && !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={40} style={{ color: '#4f46e5', marginBottom: '1rem' }} />
        <h2>Generating your preference profile...</h2>
        <p style={{ color: '#64748b' }}>Calculating pathway scores and visualizations</p>
      </div>
    );
  }

  if (error === 'PROFILE_NOT_FOUND' && !profile) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5', marginBottom: '1rem' }}>
          <Compass size={40} />
        </div>
        <h2>No Active Assessment Found</h2>
        <p style={{ color: '#64748b', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          You have not completed the 18-question pre-assessment yet. Take the assessment to uncover your primary and secondary learning preferences!
        </p>
        <Link to="/instructions" className="btn btn-primary btn-lg">
          <span>Start Pre-Assessment</span>
          <ArrowRight size={20} />
        </Link>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
        <h2>Unable to Load Profile</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
        <button type="button" className="btn btn-primary" onClick={loadProfile}>
          <RefreshCw size={18} />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{ display: 'inline-flex', padding: '1rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5', marginBottom: '1rem' }}>
          <Compass size={40} />
        </div>
        <h2>No Active Assessment Found</h2>
        <p style={{ color: '#64748b', marginBottom: '1.75rem', lineHeight: 1.6 }}>
          You have not completed the 18-question pre-assessment yet. Take the assessment to uncover your primary and secondary learning preferences!
        </p>
        <Link to="/instructions" className="btn btn-primary btn-lg">
          <span>Start Pre-Assessment</span>
          <ArrowRight size={20} />
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
        <p style={{ fontSize: '1.1rem', maxWidth: '720px', opacity: 0.95, lineHeight: 1.5 }}>
          Based on your choices, we have identified your primary and secondary pathways to help guide how lessons are presented in Module 2!
        </p>

        {profile.near_tie && (
          <div style={{ marginTop: '1.25rem', background: 'rgba(245, 158, 11, 0.25)', border: '1.5px solid #fef08a', padding: '0.85rem 1.25rem', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Info size={22} style={{ color: '#fef08a', flexShrink: 0 }} />
            <div>
              <strong>Blended / Similar Preferences:</strong> Your top two pathways have very close scores (within 5 points), indicating you engage equally well across both modalities!
            </div>
          </div>
        )}
      </div>

      {/* Top Pathways Cards */}
      <div className="pathway-cards-grid">
        <div className="pathway-card primary">
          <div className="pathway-card-header">
            <span className="badge-tag primary">Primary Pathway</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#4f46e5' }}>
              {profile.dominant?.score_0_100 != null ? `${Math.round(profile.dominant.score_0_100)}%` : ''}
            </span>
          </div>
          <div className="pathway-name">{profile.dominant?.name}</div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {profile.dominant?.code ? (PATHWAY_DESCRIPTIONS[profile.dominant.code] || 'Primary learning preference.') : 'Primary learning preference.'}
          </p>
        </div>

        <div className="pathway-card secondary">
          <div className="pathway-card-header">
            <span className="badge-tag secondary">Secondary Pathway</span>
            <span style={{ fontWeight: 800, fontSize: '1.25rem', color: '#06b6d4' }}>
              {profile.secondary?.score_0_100 != null ? `${Math.round(profile.secondary.score_0_100)}%` : ''}
            </span>
          </div>
          <div className="pathway-name">{profile.secondary?.name}</div>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            {profile.secondary?.code ? (PATHWAY_DESCRIPTIONS[profile.secondary.code] || 'Secondary learning preference.') : 'Secondary learning preference.'}
          </p>
        </div>
      </div>

      {/* Multi-Plot Visualization Engine */}
      <ProfileChart
        scores={profile.scores || []}
        dominantCode={profile.dominant?.code}
        secondaryCode={profile.secondary?.code}
      />

      {/* Scientific Framing Disclaimer */}
      <div className="disclaimer-box" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        <strong>Important Scientific Framing:</strong> MindBridge uses this profile to recommend engaging study representations (such as diagrams, stories, formulas, audio, hands-on activities, or real-world observation). It reflects your current learning preference choices; it is not a psychological or clinical intelligence test, nor a label of fixed ability.
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
