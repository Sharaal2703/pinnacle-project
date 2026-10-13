import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../api/client';
import type { QuestionVersion, AssessmentConfig, PathwayCode, QuestionType, ReviewStatus } from '@pinnacle/shared';
import {
  ShieldCheck,
  BookOpen,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Power,
  FileCheck
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'questions' | 'config'>('questions');

  // Questions State
  const [questions, setQuestions] = useState<QuestionVersion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Review Modal State
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionVersion | null>(null);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // New Question Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newType, setNewType] = useState<QuestionType>('SELF_REPORT');
  const [newPrompt, setNewPrompt] = useState('');
  const [newPathway, setNewPathway] = useState<PathwayCode>('LING');
  const [newWeight, setNewWeight] = useState(1.0);
  const [newTimeLimit, setNewTimeLimit] = useState(60);
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Config State
  const [config, setConfig] = useState<AssessmentConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);
  const [configVersion, setConfigVersion] = useState('');
  const [totalLimit, setTotalLimit] = useState(1500);
  const [selfReportLimit, setSelfReportLimit] = useState(60);
  const [scenarioLimit, setScenarioLimit] = useState(90);
  const [gracePeriod, setGracePeriod] = useState(2);
  const [minAnswered, setMinAnswered] = useState(15);
  const [nearTieMargin, setNearTieMargin] = useState(5.0);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadConfig();
  }, []);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    setError(null);
    try {
      const data = await api.listAdminQuestions();
      setQuestions(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load questions.');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const cfg = await api.getAdminConfig();
      setConfig(cfg);
      setConfigVersion(cfg.version);
      setTotalLimit(cfg.total_limit_seconds);
      setSelfReportLimit(cfg.self_report_limit_seconds);
      setScenarioLimit(cfg.scenario_limit_seconds);
      setGracePeriod(cfg.grace_period_seconds);
      setMinAnswered(cfg.min_answered_count);
      setNearTieMargin(cfg.near_tie_margin);
    } catch (err: any) {
      setError(err?.message || 'Failed to load configuration.');
    } finally {
      setIsLoadingConfig(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuestion) return;
    setIsSubmittingReview(true);
    setError(null);
    try {
      await api.reviewAdminQuestion(selectedQuestion.id, {
        reviewer_name: reviewerName.trim(),
        review_status: reviewStatus,
        review_notes: reviewNotes.trim()
      });
      setSuccessMsg(`Review recorded for ${selectedQuestion.key}`);
      setSelectedQuestion(null);
      loadQuestions();
    } catch (err: any) {
      setError(err?.message || 'Failed to record review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleToggleActivate = async (q: QuestionVersion) => {
    setError(null);
    setSuccessMsg(null);
    try {
      if (q.is_active) {
        await api.deactivateAdminQuestion(q.id);
        setSuccessMsg(`Deactivated ${q.key}`);
      } else {
        await api.activateAdminQuestion(q.id);
        setSuccessMsg(`Activated ${q.key} for assessment sessions`);
      }
      loadQuestions();
    } catch (err: any) {
      setError(err?.message || 'Action failed.');
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingNew(true);
    setError(null);
    try {
      await api.createAdminQuestion({
        key: newKey.trim(),
        type: newType,
        prompt: newPrompt.trim(),
        pathway_code: newType === 'SELF_REPORT' ? newPathway : undefined,
        weight: Number(newWeight),
        time_limit_seconds: Number(newTimeLimit),
        grade_min: 6,
        grade_max: 8,
        options:
          newType === 'SCENARIO'
            ? [
                { option_key: 'A', label: 'Option A (Story/Discussion)', order_index: 0, pathway_contributions: [{ pathway_code: 'LING', contribution: 1.0 }] },
                { option_key: 'B', label: 'Option B (Visual diagram)', order_index: 1, pathway_contributions: [{ pathway_code: 'SPAT', contribution: 1.0 }] },
                { option_key: 'C', label: 'Option C (Logic puzzle)', order_index: 2, pathway_contributions: [{ pathway_code: 'LOGI', contribution: 1.0 }] },
                { option_key: 'D', label: 'Option D (Audio/song)', order_index: 3, pathway_contributions: [{ pathway_code: 'MUSI', contribution: 1.0 }] }
              ]
            : []
      });
      setSuccessMsg(`Question draft created for ${newKey}`);
      setShowAddForm(false);
      setNewKey('');
      setNewPrompt('');
      loadQuestions();
    } catch (err: any) {
      setError(err?.message || 'Failed to create question.');
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.updateAdminConfig({
        version: configVersion.trim(),
        total_limit_seconds: Number(totalLimit),
        self_report_limit_seconds: Number(selfReportLimit),
        scenario_limit_seconds: Number(scenarioLimit),
        grace_period_seconds: Number(gracePeriod),
        min_answered_count: Number(minAnswered),
        near_tie_margin: Number(nearTieMargin)
      });
      setConfig(updated);
      setSuccessMsg(`Assessment configuration updated to v${updated.version}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to update configuration.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (questionFilter === 'ALL') return true;
    if (questionFilter === 'APPROVED') return q.review_status === 'APPROVED';
    if (questionFilter === 'DRAFT') return q.review_status === 'DRAFT';
    if (questionFilter === 'ACTIVE') return q.is_active;
    if (questionFilter === 'SELF_REPORT') return q.type === 'SELF_REPORT';
    if (questionFilter === 'SCENARIO') return q.type === 'SCENARIO';
    return true;
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ background: '#fef3c7', padding: '0.5rem', borderRadius: '0.5rem', color: '#92400e' }}>
          <ShieldCheck size={28} />
        </div>
        <div>
          <h1>Administration Dashboard</h1>
          <p style={{ color: '#64748b' }}>Manage versioned question bank, teacher reviews, and timing parameters.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={20} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle size={20} style={{ flexShrink: 0 }} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'questions' ? 'active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          <BookOpen size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Question Bank ({questions.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          <Settings size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
          Scoring & Timing Config
        </button>
      </div>

      {activeTab === 'questions' && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['ALL', 'ACTIVE', 'APPROVED', 'DRAFT', 'SELF_REPORT', 'SCENARIO'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={`btn btn-sm ${questionFilter === filter ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setQuestionFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={loadQuestions}
                disabled={isLoadingQuestions}
              >
                <RefreshCw size={14} className={isLoadingQuestions ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus size={16} />
                <span>Add Question Draft</span>
              </button>
            </div>
          </div>

          {/* Add Question Draft Collapsible Form */}
          {showAddForm && (
            <div className="card" style={{ marginBottom: '1.5rem', border: '2px solid #4f46e5' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Create Question Version Draft</h2>
              <form onSubmit={handleCreateQuestion}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Stable Key</label>
                    <input
                      className="form-input"
                      required
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      placeholder="e.g. SC_13 or SR_CUSTOM"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as QuestionType)}
                    >
                      <option value="SELF_REPORT">SELF_REPORT (1–5 scale)</option>
                      <option value="SCENARIO">SCENARIO (Options A–D)</option>
                    </select>
                  </div>
                  {newType === 'SELF_REPORT' && (
                    <div className="form-group">
                      <label className="form-label">Target Pathway</label>
                      <select
                        className="form-select"
                        value={newPathway}
                        onChange={(e) => setNewPathway(e.target.value as PathwayCode)}
                      >
                        <option value="LING">Linguistic</option>
                        <option value="LOGI">Logical-Mathematical</option>
                        <option value="SPAT">Spatial/Visual</option>
                        <option value="MUSI">Musical</option>
                        <option value="BODY">Bodily-Kinesthetic</option>
                        <option value="NATU">Naturalistic</option>
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Weight (1.0 - 3.0)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1.0"
                      max="3.0"
                      className="form-input"
                      value={newWeight}
                      onChange={(e) => setNewWeight(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Limit (Seconds)</label>
                    <input
                      type="number"
                      min="15"
                      max="300"
                      className="form-input"
                      value={newTimeLimit}
                      onChange={(e) => setNewTimeLimit(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Prompt Text</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    required
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Enter student-friendly question prompt..."
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmittingNew}>
                    {isSubmittingNew ? 'Creating...' : 'Save Draft'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Questions Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="data-table" aria-label="Question Bank List">
              <thead>
                <tr>
                  <th scope="col">Key & Ver</th>
                  <th scope="col">Type</th>
                  <th scope="col">Prompt</th>
                  <th scope="col">Review Status</th>
                  <th scope="col">Active</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuestions.map((q) => (
                  <tr key={q.id}>
                    <td>
                      <strong>{q.key}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>v{q.version}</div>
                    </td>
                    <td>
                      <span className={`question-type-badge ${q.type === 'SELF_REPORT' ? 'self-report' : 'scenario'}`} style={{ margin: 0 }}>
                        {q.type === 'SELF_REPORT' ? 'Self-Report' : 'Scenario'}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px' }}>
                      <div style={{ fontSize: '0.9rem', color: '#1e293b' }}>{q.prompt}</div>
                    </td>
                    <td>
                      {q.review_status === 'APPROVED' ? (
                        <span className="badge-tag" style={{ background: '#dcfce7', color: '#166534' }}>
                          Approved
                        </span>
                      ) : q.review_status === 'REJECTED' ? (
                        <span className="badge-tag" style={{ background: '#fee2e2', color: '#991b1b' }}>
                          Rejected
                        </span>
                      ) : (
                        <span className="badge-tag" style={{ background: '#fef3c7', color: '#92400e' }}>
                          Draft
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-tag ${q.is_active ? 'primary' : ''}`} style={{ background: q.is_active ? '#4f46e5' : '#cbd5e1', color: '#ffffff' }}>
                        {q.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          title="Record Teacher Review"
                          onClick={() => {
                            setSelectedQuestion(q);
                            setReviewerName(q.reviewer_name || '');
                            setReviewStatus(q.review_status === 'APPROVED' ? 'APPROVED' : 'APPROVED');
                            setReviewNotes(q.review_notes || '');
                          }}
                        >
                          <FileCheck size={14} />
                          <span>Review</span>
                        </button>

                        <button
                          type="button"
                          className={`btn btn-sm ${q.is_active ? 'btn-danger' : 'btn-outline'}`}
                          title={q.is_active ? 'Deactivate Question' : 'Activate Question'}
                          onClick={() => handleToggleActivate(q)}
                        >
                          <Power size={14} />
                          <span>{q.is_active ? 'Off' : 'On'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Teacher Review Modal */}
          {selectedQuestion && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '1rem'
              }}
            >
              <div className="card" style={{ maxWidth: '500px', width: '100%', margin: 0 }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                  Record Teacher Review for {selectedQuestion.key}
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
                  {selectedQuestion.prompt}
                </p>

                <form onSubmit={handleReviewSubmit}>
                  <div className="form-group">
                    <label className="form-label">Reviewer Full Name</label>
                    <input
                      className="form-input"
                      required
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="e.g. Science Curriculum Committee"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Decision</label>
                    <select
                      className="form-select"
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value as any)}
                    >
                      <option value="APPROVED">APPROVED — Ready for Middle School Students</option>
                      <option value="REJECTED">REJECTED — Needs Modification</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Review Notes</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Feedback regarding age-appropriateness, pathway neutrality, etc."
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedQuestion(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? 'Saving...' : 'Save Decision'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'config' && (
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Assessment Timing & Scoring Rules</h2>
              <p className="card-subtitle">
                Versioned configuration governing test durations, grace thresholds, and scoring rules.
              </p>
            </div>

            <form onSubmit={handleSaveConfig}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Config Version</label>
                  <input
                    className="form-input"
                    required
                    value={configVersion}
                    onChange={(e) => setConfigVersion(e.target.value)}
                    placeholder="e.g. 1.1.0"
                  />
                  <p className="form-hint">Updating config preserves audit history and creates a new version.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Total Assessment Limit (Seconds)</label>
                  <input
                    type="number"
                    min="300"
                    max="3600"
                    className="form-input"
                    value={totalLimit}
                    onChange={(e) => setTotalLimit(Number(e.target.value))}
                  />
                  <p className="form-hint">Default 1500 seconds (25 minutes).</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Self-Report Limit (Seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="180"
                    className="form-input"
                    value={selfReportLimit}
                    onChange={(e) => setSelfReportLimit(Number(e.target.value))}
                  />
                  <p className="form-hint">Default 60 seconds.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Scenario Limit (Seconds)</label>
                  <input
                    type="number"
                    min="15"
                    max="300"
                    className="form-input"
                    value={scenarioLimit}
                    onChange={(e) => setScenarioLimit(Number(e.target.value))}
                  />
                  <p className="form-hint">Default 90 seconds.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Network Grace Period (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="form-input"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(Number(e.target.value))}
                  />
                  <p className="form-hint">Server grace cushion before timing out (Default 2s).</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Answered Threshold</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    className="form-input"
                    value={minAnswered}
                    onChange={(e) => setMinAnswered(Number(e.target.value))}
                  />
                  <p className="form-hint">Minimum answered questions to issue profile (Default 15 of 18).</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Near-Tie Margin (Points)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="20"
                    className="form-input"
                    value={nearTieMargin}
                    onChange={(e) => setNearTieMargin(Number(e.target.value))}
                  />
                  <p className="form-hint">Scores within this margin are displayed as blended (Default 5.0).</p>
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={isSavingConfig}>
                  {isSavingConfig ? 'Saving Version...' : 'Save Configuration Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
