import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, ClipboardCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../api/client';
import type { ManagedAssessmentStudent } from '@pinnacle/shared';

export const AssessmentAccessPage: React.FC = () => {
  const [students, setStudents] = useState<ManagedAssessmentStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStudents(await api.listManagedAssessmentStudents());
    } catch (err: any) {
      setError(err?.message || 'Unable to load students in your assigned classes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const changeAccess = async (student: ManagedAssessmentStudent) => {
    setBusyStudentId(student.student_id);
    setError(null);
    setSuccess(null);
    try {
      const result = student.retake_authorized
        ? await api.revokeAssessmentRetake(student.student_id)
        : await api.grantAssessmentRetake(student.student_id);
      setSuccess(`${result.message} (${student.name})`);
      await loadStudents();
    } catch (err: any) {
      setError(err?.message || 'Could not update assessment access.');
    } finally {
      setBusyStudentId(null);
    }
  };

  return (
    <div className="staff-access-page">
      <header className="staff-page-heading">
        <div className="staff-page-icon"><ClipboardCheck size={28} /></div>
        <div>
          <h1>Assessment Access</h1>
          <p>Review student assessment status and authorize a retake after a completed assessment.</p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={loadStudents} disabled={isLoading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      <div className="access-policy-note">
        <ShieldCheck size={20} />
        Each authorization permits one new attempt. It is consumed when that attempt starts; an unused authorization can be revoked.
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={20} />{error}</div>}
      {success && <div className="alert alert-success"><CheckCircle size={20} />{success}</div>}

      {isLoading ? (
        <div className="access-state">Loading students…</div>
      ) : students.length === 0 ? (
        <div className="card access-state">
          <h2>No assigned students found</h2>
          <p>Students appear here after they are assigned to one of your classes.</p>
        </div>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Grade / Class</th>
                <th>Assessment</th>
                <th>Retake access</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td>
                    <strong>{student.name}</strong>
                    <span className="staff-table-subtext">@{student.username}</span>
                  </td>
                  <td>Grade {student.grade}{student.class_name ? <span className="staff-table-subtext">{student.class_name}</span> : null}</td>
                  <td>
                    {student.has_completed_assessment ? 'Completed' : student.has_in_progress_attempt ? 'In progress' : 'Not started'}
                  </td>
                  <td>
                    <span className={`access-status ${student.retake_authorized ? 'authorized' : ''}`}>
                      {student.retake_authorized ? 'Authorized' : 'Not authorized'}
                    </span>
                  </td>
                  <td>
                    {student.can_manage_retake && (
                      <button
                        type="button"
                        className={student.retake_authorized ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                        onClick={() => changeAccess(student)}
                        disabled={busyStudentId === student.student_id}
                      >
                        {busyStudentId === student.student_id
                          ? 'Saving…'
                          : student.retake_authorized ? 'Revoke' : 'Authorize retake'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
