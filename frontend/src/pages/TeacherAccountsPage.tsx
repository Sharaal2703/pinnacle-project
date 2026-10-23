import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import { api } from '../api/client';
import { SelectField } from '../components/SelectField';
import type { TeacherAccount } from '@pinnacle/shared';

const TeacherAssignmentPanel: React.FC<{ teacher: TeacherAccount }> = ({ teacher }) => {
  const [assignments, setAssignments] = useState<Awaited<ReturnType<typeof api.listTeacherAssignments>>>([]);
  const [classes, setClasses] = useState<{ id: string; grade: number; section: string; academic_year: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [current, options, availableSubjects] = await Promise.all([api.listTeacherAssignments(teacher.id), api.getRegistrationOptions(), api.listAdminLearningSubjects()]);
      const teacherClasses = options.classes.filter(c => c.school_id === teacher.school_id);
      setAssignments(current); setClasses(teacherClasses); setSubjects(availableSubjects);
      if (!classId && teacherClasses.length) setClassId(teacherClasses[0].id);
      if (!subjectId && availableSubjects.length) setSubjectId(availableSubjects[0].id);
      setError('');
    } catch (e: any) { setError(e?.message || 'Could not load class assignments.'); }
  };
  useEffect(() => { void load(); }, [teacher.id]);

  const addAssignment = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await api.assignTeacherToClass(teacher.id, classId, subjectId); await load(); }
    catch (e: any) { setError(e?.message || 'Could not assign this class.'); }
    finally { setSaving(false); }
  };

  const removeAssignment = async (assignmentId: string) => {
    setSaving(true); setError('');
    try { await api.removeTeacherAssignment(teacher.id, assignmentId); await load(); }
    catch (e: any) { setError(e?.message || 'Could not remove this assignment.'); }
    finally { setSaving(false); }
  };

  return <div style={{ padding: '1rem', background: '#f8fafc' }}>
    <strong>Class and subject assignments · {teacher.school_name}</strong>
    {error && <div className="alert alert-error" style={{ margin: '.75rem 0' }}>{error}</div>}
    {!classes.length ? <p>No classes exist for this teacher’s school. Create a class first.</p> : !subjects.length ? <p>No subjects are configured.</p> : <form onSubmit={addAssignment} style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'end', margin: '.75rem 0' }}>
      <label>Class<SelectField ariaLabel="Class" value={classId} onChange={setClassId} options={classes.map(c => ({ value: c.id, label: `Grade ${c.grade} · ${c.section} · ${c.academic_year}` }))} /></label>
      <label>Subject<SelectField ariaLabel="Subject" value={subjectId} onChange={setSubjectId} options={subjects.map(s => ({ value: s.id, label: s.name }))} /></label>
      <button className="btn btn-primary btn-sm" disabled={saving || !classId || !subjectId}>Assign</button>
    </form>}
    {!assignments.length ? <p>No class assignments yet.</p> : <ul style={{ paddingLeft: '1.25rem' }}>{assignments.map(a => <li key={a.id} style={{ margin: '.35rem 0' }}>Grade {a.class.grade} · {a.class.section} · {a.class.academic_year} — {a.subject.name} <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={() => void removeAssignment(a.id)}>Remove</button></li>)}</ul>}
  </div>;
};

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
  const [classes, setClasses] = useState<{ id: string; school_id: string; grade: number; section: string; academic_year: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [managingTeacher, setManagingTeacher] = useState<string | null>(null);
  const [optionsError, setOptionsError] = useState('');

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
    api.getRegistrationOptions().then((options) => {
      setSchools(options.schools); setClasses(options.classes); setOptionsError('');
    }).catch((error: any) => setOptionsError(error?.message || 'Could not load schools and classes.'));
    api.listAdminLearningSubjects().then(setSubjects).catch(() => setSubjects([]));
  }, []);

  const schoolClasses = classes.filter((schoolClass) => schoolClass.school_id === schoolId);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!addNewSchool && !schoolId) {
      setError('Select a school or add a new school before creating the teacher account.');
      return;
    }
    if (Boolean(classId) !== Boolean(subjectId)) {
      setError('Choose both a class and subject, or leave both unassigned.');
      return;
    }
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
        ...(classId && subjectId && !addNewSchool ? { class_id: classId, subject_id: subjectId } : {}),
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
      setClassId('');
      setSubjectId('');
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
      {optionsError && <div className="alert alert-error"><AlertCircle size={20} />{optionsError}</div>}

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
                <SelectField id="teacher-school" ariaLabel="School" value={schoolId} onChange={(value) => { setSchoolId(value); setClassId(''); }} required options={[{ value: '', label: 'Select school' }, ...schools.map((school) => ({ value: school.id, label: school.name }))]} />
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
          {!addNewSchool && <>
            <div className="form-group">
              <label className="form-label" htmlFor="teacher-class">Class and section (optional)</label>
              <SelectField id="teacher-class" ariaLabel="Class and section" value={classId} onChange={setClassId} disabled={!schoolId || !schoolClasses.length} options={[{ value: '', label: !schoolId ? 'Choose a school first' : 'Assign later with Manage classes' }, ...schoolClasses.map((schoolClass) => ({ value: schoolClass.id, label: `Grade ${schoolClass.grade} · Section ${schoolClass.section} · ${schoolClass.academic_year}` }))]} />
              {schoolId && !schoolClasses.length && <span className="form-hint">No classes are configured for this school yet. You can assign one later.</span>}
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="teacher-subject">Assigned subject (optional)</label>
              <SelectField id="teacher-subject" ariaLabel="Assigned subject" value={subjectId} onChange={setSubjectId} disabled={!classId || !subjects.length} options={[{ value: '', label: 'Choose a subject' }, ...subjects.map((subject) => ({ value: subject.id, label: subject.name }))]} />
              {classId && !subjectId && <span className="form-hint">Choose a subject to assign this class during account creation.</span>}
            </div>
          </>}
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
              <thead><tr><th>Name</th><th>Username</th><th>School</th><th>Account status</th><th>Created</th><th>Class assignments</th></tr></thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id}>
                    <td><strong>{teacher.name}</strong></td>
                    <td>{teacher.username}</td>
                    <td>{teacher.school_name}</td>
                    <td><span className={`access-status ${teacher.is_active ? 'authorized' : ''}`}>{teacher.is_active ? 'Active' : 'Disabled'}</span></td>
                    <td>{new Date(teacher.created_at).toLocaleDateString()}</td>
                    <td><button type="button" className="btn btn-secondary btn-sm" onClick={() => setManagingTeacher(managingTeacher === teacher.id ? null : teacher.id)}>{managingTeacher === teacher.id ? 'Close' : 'Manage classes'}</button></td>
                  </tr>
                ))}
                {teachers.filter(teacher => teacher.id === managingTeacher).map(teacher => <tr key={`${teacher.id}-assignments`}><td colSpan={6}><TeacherAssignmentPanel teacher={teacher} /></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
