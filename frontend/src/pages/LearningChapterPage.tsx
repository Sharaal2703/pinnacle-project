import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, CheckCircle2, ExternalLink, FileText, Image as ImageIcon, PlayCircle, RefreshCw } from 'lucide-react';
import { api, ApiError, type LearningCatalog, type LearningConcept, type LearningResourceSummary } from '../api/client';

const formatIcon = (format: LearningResourceSummary['format']) => {
  if (format === 'VIDEO') return <PlayCircle size={17} />;
  if (format === 'IMAGE') return <ImageIcon size={17} />;
  return <FileText size={17} />;
};

export const LearningChapterPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [catalog, setCatalog] = useState<LearningCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setCatalog(await api.getLearningCatalog());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load this chapter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const openResource = async (concept: LearningConcept, resource: LearningResourceSummary) => {
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    setBusy(resource.id);
    try {
      await api.updateConceptProgress(concept.id, {
        status: 'IN_PROGRESS',
        progressPercent: Math.max(1, concept.progress[0]?.progressPercent ?? 0),
        resourceId: resource.id,
      });
      const result = await api.openLearningResource(resource.id);
      if (popup) popup.location.replace(result.url);
      else window.location.assign(result.url);
      await load();
    } catch (e) {
      popup?.close();
      setError(e instanceof ApiError ? e.message : 'Could not open this resource.');
    } finally {
      setBusy(null);
    }
  };

  const completeConcept = async (concept: LearningConcept) => {
    setBusy(concept.id);
    try {
      await api.updateConceptProgress(concept.id, { status: 'COMPLETED', progressPercent: 100 });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save progress.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="learning-loading"><RefreshCw className="spin" size={36} /><p>Loading chapter…</p></div>;
  }

  const subject = catalog?.subjects.find(item => item.chapters.some(chapter => chapter.id === chapterId));
  const chapter = subject?.chapters.find(item => item.id === chapterId);

  if (!chapter || !subject) {
    return (
      <div className="learning-library-page">
        <section className="card learning-empty-state">
          <h1>Chapter not found</h1>
          <p>This chapter is unavailable for your grade.</p>
          <Link to="/learning" className="btn btn-primary"><ArrowLeft size={17} /> Back to Learning Library</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="learning-library-page">
      <Link to="/learning" state={{ subjectId: subject.id }} className="learning-back-link"><ArrowLeft size={17} /> Learning Library</Link>
      <header className="learning-chapter-page-heading">
        <p>Grade {catalog?.grade} · {subject.name}{chapter.term ? ` · Term ${chapter.term}` : ''}</p>
        <h1>Chapter {chapter.orderIndex}: {chapter.title}</h1>
        {chapter.description && <p className="learning-chapter-description">{chapter.description}</p>}
        {catalog?.preferredPathways.length ? <p>Dominant intelligence: <b>{catalog.preferredPathways[0]}</b></p> : null}
      </header>

      {error && <div className="alert alert-error" role="alert">{error} <button className="btn btn-secondary btn-sm" onClick={() => void load()}>Retry</button></div>}
      {catalog?.profileRequired && <div className="alert learning-profile-note">Complete your pre-assessment before accessing recommended learning resources.</div>}

      {!chapter.concepts.length ? (
        <section className="card learning-empty-state">No concepts have been added to this chapter yet.</section>
      ) : (
        <section className="learning-concept-list" aria-label="Chapter concepts">
          {chapter.concepts.map(concept => {
            const progress = concept.progress[0];
            return (
              <article className="learning-concept-card" key={concept.id}>
                <div className="learning-concept-heading">
                  <div>
                    <h2>Concept {concept.orderIndex}: {concept.title}</h2>
                    {concept.learningObjective && <p>{concept.learningObjective}</p>}
                    {concept.description && <p className="learning-concept-description">{concept.description}</p>}
                  </div>
                  {progress?.status === 'COMPLETED' && <span className="learning-completed"><CheckCircle2 size={16} /> Completed</span>}
                </div>

                {concept.resources.length ? (
                  <div className="learning-resource-actions">
                    {concept.resources.map(resource => (
                      <button
                        type="button"
                        key={resource.id}
                        className="btn btn-primary btn-sm"
                        disabled={busy === resource.id}
                        onClick={() => void openResource(concept, resource)}
                      >
                        {formatIcon(resource.format)} {resource.title} · {resource.pathway.name} <ExternalLink size={14} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="learning-term-empty">No resources published for your learning profile yet.</p>
                )}

                {progress?.status !== 'COMPLETED' && concept.resources.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm learning-complete-button"
                    disabled={busy === concept.id}
                    onClick={() => void completeConcept(concept)}
                  >
                    <BookOpen size={15} /> Mark concept complete
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};
