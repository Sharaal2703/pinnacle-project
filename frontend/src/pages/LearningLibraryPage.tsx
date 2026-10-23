import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, RefreshCw } from 'lucide-react';
import { api, ApiError, type LearningCatalog } from '../api/client';

const TERMS = [1, 2, 3] as const;

export const LearningLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnSubjectId = (location.state as { subjectId?: string } | null)?.subjectId ?? null;
  const [catalog, setCatalog] = useState<LearningCatalog | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(returnSubjectId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCatalog(await api.getLearningCatalog());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load learning content.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return <div className="learning-loading"><RefreshCw className="spin" size={36} /><p>Loading your learning library…</p></div>;
  }

  const subjects = catalog?.subjects ?? [];
  const selectedSubject = subjects.find(subject => subject.id === selectedSubjectId) ?? subjects[0];

  return (
    <div className="learning-library-page">
      <header className="learning-library-heading">
        <h1>Learning Library</h1>
        <p>Grade {catalog?.grade}</p>
        {catalog?.preferredPathways.length ? <p>Dominant intelligence: <b>{catalog.preferredPathways[0]}</b></p> : null}
      </header>

      {error && <div className="alert alert-error" role="alert">{error} <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Retry</button></div>}
      {catalog?.profileRequired && <div className="alert learning-profile-note">Complete your pre-assessment before accessing recommended learning resources.</div>}

      {!subjects.length ? (
        <section className="card learning-empty-state">No subjects are configured yet. Please contact your school administrator.</section>
      ) : (
        <>
          <nav className="learning-subject-grid" aria-label="Subjects">
            {subjects.map(subject => (
              <button
                type="button"
                key={subject.id}
                className={`learning-subject-card${subject.id === selectedSubject?.id ? ' is-selected' : ''}`}
                aria-pressed={subject.id === selectedSubject?.id}
                onClick={() => setSelectedSubjectId(subject.id)}
              >
                <span className="learning-subject-icon"><BookOpen size={23} /></span>
                <span className="learning-subject-name">{subject.name}</span>
                <span className="learning-subject-count">{subject.chapters.length} {subject.chapters.length === 1 ? 'chapter' : 'chapters'}</span>
              </button>
            ))}
          </nav>

          {selectedSubject && (
            <section className="learning-selected-subject" aria-labelledby="selected-subject-title">
              <div className="learning-selected-heading">
                <div>
                  <h2 id="selected-subject-title">{selectedSubject.name}</h2>
                </div>
                <p>Choose a term to find its chapters and learning resources.</p>
              </div>

              <div className="learning-term-grid">
                {TERMS.map(term => {
                  const chapters = selectedSubject.chapters.filter(chapter => chapter.term === term);
                  return (
                    <section className="learning-term-card" key={term} aria-labelledby={`term-${term}-title`}>
                      <header className="learning-term-heading">
                        <h3 id={`term-${term}-title`}>Term {term}</h3>
                        <span>{chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}</span>
                      </header>

                      {!chapters.length ? (
                        <p className="learning-term-empty">No chapters added for this term yet.</p>
                      ) : (
                        <div className="learning-chapter-list">
                          {chapters.map(chapter => (
                            <button
                              type="button"
                              className="learning-chapter-link"
                              key={chapter.id}
                              onClick={() => navigate(`/learning/chapters/${chapter.id}`, { state: { subjectId: selectedSubject.id } })}
                            >
                              <span>{chapter.orderIndex}. {chapter.title}</span>
                              <ArrowRight size={18} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>

              {selectedSubject.chapters.some(chapter => chapter.term == null) && (
                <section className="learning-unassigned-term">
                  <h3>Chapters without a term</h3>
                  <p>These chapters need a term selected in the curriculum settings.</p>
                  <div className="learning-chapter-list">
                    {selectedSubject.chapters.filter(chapter => chapter.term == null).map(chapter => (
                      <button type="button" className="learning-chapter-link" key={chapter.id} onClick={() => navigate(`/learning/chapters/${chapter.id}`, { state: { subjectId: selectedSubject.id } })}>
                        <span>Chapter {chapter.orderIndex}: {chapter.title}</span>
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
};
