import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { LikertQuestion } from '../components/QuestionRenderer/LikertQuestion';
import { Compass, CheckCircle2, Clock, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

export const InstructionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [sampleRating, setSampleRating] = useState<number | null>(4);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartAssessment = async () => {
    setIsStarting(true);
    setError(null);
    try {
      await api.startOrResumeAttempt();
      navigate('/assessment');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not start assessment session. Please try again.');
      }
      setIsStarting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5', marginBottom: '0.75rem' }}>
            <Compass size={36} />
          </div>
          <h1 className="card-title" style={{ fontSize: '2rem' }}>Learning Preference Assessment</h1>
          <p className="card-subtitle" style={{ fontSize: '1.05rem' }}>
            A friendly questionnaire designed to discover the representations and activities you enjoy most in class!
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4f46e5', fontWeight: 700, marginBottom: '0.5rem' }}>
              <Sparkles size={20} />
              <span>18 Questions</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              6 quick preference statements + 12 fun learning scenarios from science and history.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#06b6d4', fontWeight: 700, marginBottom: '0.5rem' }}>
              <Clock size={20} />
              <span>25 Minutes Total</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Plenty of time! Each question also has its own timer so you can keep a steady pace.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, marginBottom: '0.5rem' }}>
              <CheckCircle2 size={20} />
              <span>No Wrong Answers!</span>
            </div>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              This is not an exam. Choose the options that feel most exciting and natural to you.
            </p>
          </div>
        </div>

        {/* Important Tips */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>How it works:</h2>
          <ul style={{ paddingLeft: '1.25rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.95rem' }}>
            <li>
              <strong>Self-Report Questions (1 to 6):</strong> Rate how much you agree with statements using the 5 emoji buttons (Strongly Disagree to Strongly Agree).
            </li>
            <li>
              <strong>Scenario Questions (7 to 18):</strong> Imagine yourself in class and pick the activity you would prefer to do.
            </li>
            <li>
              <strong>Safe Progress:</strong> Every answer is saved automatically to the server as soon as you choose. If your connection drops, refreshing returns you to your current question.
            </li>
            <li>
              <strong>Profile Outcome:</strong> When you complete at least 15 questions, your indicative learning-preference profile will highlight your primary and secondary pathways!
            </li>
          </ul>
        </div>

        {/* Sample Practice Question */}
        <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.75rem', padding: '1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            <Sparkles size={16} />
            <span>Try a practice question (not scored)</span>
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#166534', marginBottom: '1.25rem' }}>
            "I enjoy working on puzzles and figuring out mystery problems."
          </div>
          <LikertQuestion
            selectedRating={sampleRating}
            onSelectRating={(r) => setSampleRating(r)}
          />
          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: '#15803d', fontStyle: 'italic' }}>
            Click an emoji to see how selecting an answer works!
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleStartAssessment}
            disabled={isStarting}
            style={{ width: '100%', maxWidth: '360px' }}
          >
            <span>{isStarting ? 'Preparing Assessment...' : 'Start Assessment Now'}</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
