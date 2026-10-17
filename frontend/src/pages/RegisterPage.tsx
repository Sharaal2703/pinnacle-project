import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { UserPlus, Compass, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState<number>(7);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password,
        grade: Number(grade)
      });
      navigate('/instructions');
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.details && err.details.length > 0) {
          setError(err.details.map((d: any) => d.message || d.issue).join(', '));
        } else {
          setError(err.message);
        }
      } else {
        setError('Registration failed. Please check your details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5', marginBottom: '0.75rem' }}>
            <Compass size={36} />
          </div>
          <h1 className="card-title">Join MindBridge</h1>
          <p className="card-subtitle">Create your student account to discover your learning style</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              required
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maya Sharma"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="username">Choose a Username</label>
            <input
              id="username"
              type="text"
              required
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. maya_student"
              autoComplete="username"
            />
            <p className="form-hint">At least 3 characters. Use letters and numbers.</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="grade">Grade / Class</label>
            <select
              id="grade"
              className="form-select"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            >
              <option value={6}>Class 6 (Middle School)</option>
              <option value={7}>Class 7 (Middle School)</option>
              <option value={8}>Class 8 (Middle School)</option>
            </select>
            <p className="form-hint">MindBridge is designed for middle school students (Grades 6–8).</p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={isSubmitting}
          >
            <UserPlus size={18} />
            <span>{isSubmitting ? 'Creating account...' : 'Create Account & Begin'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
};
