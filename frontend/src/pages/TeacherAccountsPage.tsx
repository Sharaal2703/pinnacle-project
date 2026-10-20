import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { api } from '../api/client';
import type { TeacherAccount } from '@pinnacle/shared';

export const TeacherAccountsPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [addNewSchool, setAddNewSchool] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolDistrict, setSchoolDistrict] = useState('');
  const [schoolState, setSchoolState] = useState('');
  const [schoolPincode, setSchoolPincode] = useState('');
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTeachers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setTeachers(await api.listTeacherAccounts());
    } catch (err: any) {
      setError(err?.message || 'Could not load teacher accounts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);
  useEffect(() => {
    api.getRegistrationOptions().then((options) => setSchools(options.schools)).catch(() => setSchools([]));
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const teacher = await api.createTeacherAccount({
        name: name.trim(),
        username: username.trim(),
        password,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        ...(addNewSchool ? {
          new_school: {
            school_name: schoolName.trim(),
            address: schoolAddress.trim() || undefined,
            city: schoolCity.trim() || undefined,
            district: schoolDistrict.trim() || undefined,
            state: schoolState.trim() || undefined,
            pincode: schoolPincode.trim() || undefined
          }
        } : { school_id: schoolId }),
        employee_number: employeeNumber.trim() || undefined
      });
      setSuccess(`Teacher account created for ${teacher.name} (${teacher.username}). Share the initial password with them securely.`);
      setName('');
      setUsername('');
      setPassword('');
      setEmail('');
      setPhone('');
      setLocation('');
      setSchoolId('');
      setEmployeeNumber('');
      setAddNewSchool(false);
      setSchoolName('');
      setSchoolAddress('');
      setSchoolCity('');
      setSchoolDistrict('');
      setSchoolState('');
      setSchoolPincode('');
      await loadTeachers();
    } catch (err: any) {
      setError(err?.message || 'Could not create the teacher account.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="staff-access-page">
      <header className="staff-page-heading">
        <div className="staff-page-icon"><UsersRound size={28} /></div>
        <div>
          <h1>Teacher Accounts</h1>
          <p>Create teacher sign-in accounts. Teachers—not administrators—authorize student retakes.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadTeachers} disabled={isLoading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && <div className="alert alert-error"><AlertCircle size={20} />{error}</div>}
      {success && <div className="alert alert-success"><CheckCircle size={20} />{success}</div>}

      <section className="card teacher-create-card">
        <h2 className="card-title"><UserPlus size={21} /> Create Teacher Account</h2>
        <p className="card-subtitle">The teacher can sign in with the username and initial password you set here.</p>
        <form onSubmit={handleCreate} className="teacher-create-form">
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-name">Teacher name</label>
            <input id="teacher-name" className="form-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-email">Email</label>
            <input id="teacher-email" type="email" className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-phone">Phone</label>
            <input id="teacher-phone" type="tel" className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-location">Location</label>
            <input id="teacher-location" className="form-input" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="City or locality" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-school">School</label>
            {!addNewSchool ? (
              <>
                <select id="teacher-school" className="form-select" value={schoolId} onChange={(event) => setSchoolId(event.target.value)} required>
                  <option value="">Select school</option>
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                </select>
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setAddNewSchool(true); setSchoolId(''); }}>
                  Add a new school
                </button>
              </>
            ) : (
              <>
                <input className="form-input" aria-label="School name" placeholder="School name" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required />
                <input className="form-input" style={{ marginTop: '0.5rem' }} aria-label="School address" placeholder="Address (optional)" value={schoolAddress} onChange={(event) => setSchoolAddress(event.target.value)} />
                <div className="teacher-school-location-grid">
                  <input className="form-input" aria-label="City" placeholder="City" value={schoolCity} onChange={(event) => setSchoolCity(event.target.value)} />
                  <input className="form-input" aria-label="District" placeholder="District" value={schoolDistrict} onChange={(event) => setSchoolDistrict(event.target.value)} />
                  <input className="form-input" aria-label="State" placeholder="State" value={schoolState} onChange={(event) => setSchoolState(event.target.value)} />
                  <input className="form-input" aria-label="Pincode" placeholder="Pincode" value={schoolPincode} onChange={(event) => setSchoolPincode(event.target.value)} />
                </div>
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => setAddNewSchool(false)}>
                  Choose an existing school
                </button>
              </>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-employee-number">Employee number (optional)</label>
            <input id="teacher-employee-number" className="form-input" value={employeeNumber} onChange={(event) => setEmployeeNumber(event.target.value)} maxLength={50} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-username">Username</label>
            <input id="teacher-username" className="form-input" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={50} autoComplete="off" required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="teacher-password">Initial password</label>
            <input id="teacher-password" className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required />
            <span className="form-hint">Use at least 8 characters.</span>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isCreating}>
            <ShieldCheck size={18} /> {isCreating ? 'Creating account…' : 'Create Teacher Account'}
          </button>
        </form>
      </section>

      <section>
        <div className="teacher-list-heading">
          <h2>Existing Teachers</h2>
          <span className="access-status">{teachers.length} accounts</span>
        </div>
        {isLoading ? (
          <div className="access-state">Loading teacher accounts…</div>
        ) : teachers.length === 0 ? (
          <div className="card access-state"><p>No teacher accounts have been created yet.</p></div>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead><tr><th>Name</th><th>Username</th><th>School</th><th>Account status</th><th>Created</th></tr></thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td><strong>{teacher.name}</strong></td>
                    <td>{teacher.username}</td>
                    <td>{teacher.school_name}</td>
                    <td><span className={`access-status ${teacher.is_active ? 'authorized' : ''}`}>{teacher.is_active ? 'Active' : 'Disabled'}</span></td>
                    <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
