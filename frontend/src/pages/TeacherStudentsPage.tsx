import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, ClipboardCheck, FileText, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { api, type TeacherStudentReport } from '../api/client';
import type { ManagedAssessmentStudent } from '@pinnacle/shared';
import { ProfileChart } from '../components/ProfileChart';

export const TeacherStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<ManagedAssessmentStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyStudentId, setBusyStudentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [report, setReport] = useState<TeacherStudentReport | null>(null);
  const [reportStudent, setReportStudent] = useState<ManagedAssessmentStudent | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

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

  const viewReport = async (student: ManagedAssessmentStudent) => {
    setReportStudent(student);
    setReport(null);
    setReportError(null);
    setReportLoading(true);
    try { setReport(await api.getAssignedStudentReport(student.student_id)); }
    catch (err: any) { setReportError(err?.message || 'Could not load this student’s report.'); }
    finally { setReportLoading(false); }
  };

  const closeReport = () => { setReportStudent(null); setReport(null); setReportError(null); };

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
                <th>Detailed report</th>
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
                    {student.can_manage_retake ? (
                      <button
                        type="button"
                        className={student.retake_authorized ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                        onClick={() => changeAccess(student)}
                        disabled={busyStudentId === student.student_id}
                      >
                        {busyStudentId === student.student_id ? 'Saving…' : student.retake_authorized ? 'Revoke retake' : 'Authorize retake'}
                      </button>
                    ) : <span className="access-status">Available after completion</span>}
                  </td>
                  <td>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => void viewReport(student)}>
                      <FileText size={16} /> View report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {reportStudent && <div className="student-report-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReport(); }}>
        <section className="student-report-dialog" role="dialog" aria-modal="true" aria-labelledby="student-report-title">
          <header className="student-report-header">
            <div>
              <h2 id="student-report-title">Student profile report</h2>
              <p>{reportStudent.name} · @{reportStudent.username} · Grade {reportStudent.grade}{reportStudent.class_name ? ` · ${reportStudent.class_name}` : ''}</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" aria-label="Close report" onClick={closeReport}><X size={18} /></button>
          </header>
          {reportLoading ? <div className="access-state">Loading student profile…</div>
            : reportError ? <div className="alert alert-error">{reportError}</div>
              : report?.profile ? <>
                <div className="student-report-summary">
                  <div><span>Dominant intelligence</span><strong>{report.profile.dominant.name}</strong></div>
                  <div><span>Secondary intelligence</span><strong>{report.profile.secondary.name}</strong></div>
                  <div><span>Assessment date</span><strong>{new Date(report.profile.created_at).toLocaleDateString()}</strong></div>
                  <div><span>Equal top scores</span><strong>{report.profile.tie ? 'Yes · response time used' : 'No'}</strong></div>
                </div>
                <ProfileChart scores={report.profile.scores} dominantCode={report.profile.dominant.code} secondaryCode={report.profile.secondary.code} />
              </> : <div className="card access-state"><h3>No completed profile yet</h3><p>This student’s detailed report will be available after they complete the pre-assessment.</p></div>}
        </section>
      </div>}
    </div>
  );
};
