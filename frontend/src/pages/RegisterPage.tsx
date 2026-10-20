import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, api } from '../api/client';
import { UserPlus, Compass, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState<number>(7);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [classId, setClassId] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [options, setOptions] = useState<{ schools: { id: string; name: string }[]; classes: { id: string; school_id: string; grade: number; section: string; academic_year: string }[] }>({ schools: [], classes: [] });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getRegistrationOptions().then(setOptions).catch(() => setOptions({ schools: [], classes: [] }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        password,
        grade: Number(grade),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        school_id: schoolId || undefined,
        class_id: classId || undefined,
        admission_number: admissionNumber.trim() || undefined
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
    <div className="registration-page">
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

        <form onSubmit={handleSubmit} className="registration-form-grid">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              required
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kumar"
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
              placeholder="e.g. kumar123"
              autoComplete="username"
            />
            <p className="form-hint">At least 3 characters. Use letters and numbers.</p>
          </div>

          <div className="form-group registration-form-full">
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
            <label className="form-label" htmlFor="email">Email (optional)</label>
            <input id="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">Location</label>
            <input id="location" type="text" className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or locality" required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="admission-number">Admission number (optional)</label>
            <input id="admission-number" className="form-input" value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} maxLength={50} />
          </div>

          <div className="form-group registration-form-full">
            <label className="form-label" htmlFor="school">School</label>
            <select id="school" className="form-select" value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setClassId(''); }} required>
              <option value="">Select school</option>
              {options.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            {options.schools.length === 0 && <p className="form-hint">School records have not been added yet. You can complete registration without one.</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="grade">Class</label>
            <select
              id="grade"
              className="form-select"
              value={grade}
              disabled={!schoolId}
              onChange={(e) => { setGrade(Number(e.target.value)); setClassId(''); }}
              required
            >
              <option value={6}>Class 6 (Middle School)</option>
              <option value={7}>Class 7 (Middle School)</option>
              <option value={8}>Class 8 (Middle School)</option>
            </select>
            <p className="form-hint">MindBridge is designed for middle school students (Grades 6-8).</p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="school-class">Section</label>
            <select id="school-class" className="form-select" value={classId} disabled={!schoolId} onChange={(e) => setClassId(e.target.value)} required>
              <option value="">Select section</option>
              {options.classes.filter((item) => item.school_id === schoolId && item.grade === grade).map((item) => (
                <option key={item.id} value={item.id}>{item.section}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem', gridColumn: '1 / -1' }}
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
