import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { LogIn, Compass, Info, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login({ username: username.trim(), password });
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/instructions');
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', background: '#e0e7ff', borderRadius: '50%', color: '#4f46e5', marginBottom: '0.75rem' }}>
            <Compass size={36} />
          </div>
          <h1 className="card-title">Welcome to MindBridge</h1>
          <p className="card-subtitle">Discover your personalized learning preferences</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              required
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. student1"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={isSubmitting}
          >
            <LogIn size={18} />
            <span>{isSubmitting ? 'Logging in...' : 'Sign In'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b' }}>
          New student?{' '}
          <Link to="/register" style={{ fontWeight: 600 }}>Create an account</Link>
        </div>
      </div>

      {/* Quick Demo Credential Buttons */}
      <div className="card" style={{ padding: '1.25rem', background: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: '#4f46e5', fontWeight: 600, fontSize: '0.85rem' }}>
          <Info size={16} />
          <span>Quick Demo Accounts</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('student1', 'StudentPass123!')}
          >
            Fill Demo Student
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fillDemo('admin', 'AdminPass123!')}
          >
            Fill Demo Admin
          </button>
        </div>
      </div>
    </div>
  );
};
