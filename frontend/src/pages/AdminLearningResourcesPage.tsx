import React, { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import { SelectField } from '../components/SelectField';
import { Check, CloudUpload, RefreshCw } from 'lucide-react';

type Resource = {
  id: string; title: string; format: 'VIDEO' | 'IMAGE' | 'PDF'; status: string; fileSizeBytes: number | null;
  mimeType: string | null; storagePath: string | null; durationSeconds: number | null;
  pathway: { code: string; name: string };
  concept: { title: string; chapter: { title: string; grade: number; subject: { name: string } } };
};
type Chapter = { id: string; title: string; grade: number; term: number | null; orderIndex: number; curriculumReference: string | null; subject: { id: string; name: string; code: string }; concepts: { id: string; conceptKey: string; title: string }[]; _count: { concepts: number } };
const formatBytes = (size: number) => `${(size / (1024 * 1024)).toFixed(1)} MB`;

export const AdminLearningResourcesPage: React.FC = () => {
  const [items, setItems] = useState<Resource[]>([]);
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [duration, setDuration] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState<'resources' | 'curriculum'>('resources');
  const [subjects, setSubjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterForm, setChapterForm] = useState({ subjectId: '', grade: 6, term: 1, title: '', description: '', curriculumReference: '', orderIndex: 1 });
  const [conceptForm, setConceptForm] = useState({ chapterId: '', conceptKey: '', title: '', learningObjective: '', curriculumReference: '', difficulty: 'MEDIUM' as 'EASY' | 'MEDIUM' | 'CHALLENGING', orderIndex: 1 });
  const [resourceForm, setResourceForm] = useState({ conceptId: '', pathwayCode: 'VIS' as 'VIS' | 'LING' | 'LOGI', format: 'VIDEO' as 'VIDEO' | 'IMAGE' | 'PDF', title: '', sourceReference: '' });
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const load = async () => {
    setError('');
    try { setItems(await api.listAdminLearningResources(status)); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not load resources.'); }
  };
  useEffect(() => { void load(); }, [status]);

  const loadCurriculum = async () => {
    setError('');
    try {
      const [subjectRows, chapterRows] = await Promise.all([api.listAdminLearningSubjects(), api.listAdminCurriculum()]);
      setSubjects(subjectRows); setChapters(chapterRows);
      if (!chapterForm.subjectId && subjectRows.length) setChapterForm(v => ({ ...v, subjectId: subjectRows[0].id }));
      if (!conceptForm.chapterId && chapterRows.length) setConceptForm(v => ({ ...v, chapterId: chapterRows[0].id }));
      const allConcepts = chapterRows.flatMap((chapter: Chapter) => chapter.concepts);
      if (!resourceForm.conceptId && allConcepts.length) setResourceForm(v => ({ ...v, conceptId: allConcepts[0].id }));
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not load curriculum.'); }
  };

  useEffect(() => { if (tab === 'curriculum') void loadCurriculum(); }, [tab]);

  const createChapter = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('curriculum'); setError(''); setMessage('');
    try {
      await api.createAdminCurriculumChapter({ ...chapterForm, title: chapterForm.title.trim(), ...(chapterForm.description ? {} : { description: undefined }), ...(chapterForm.curriculumReference ? {} : { curriculumReference: undefined }) });
      setChapterForm(v => ({ ...v, title: '', description: '', curriculumReference: '', orderIndex: v.orderIndex + 1 })); setMessage('Chapter created.'); await loadCurriculum();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not create chapter.'); }
    finally { setBusy(''); }
  };

  const createConcept = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy('curriculum'); setError(''); setMessage('');
    try {
      await api.createAdminCurriculumConcept(conceptForm.chapterId, { ...conceptForm, conceptKey: conceptForm.conceptKey.trim(), title: conceptForm.title.trim(), ...(conceptForm.learningObjective ? {} : { learningObjective: undefined }), ...(conceptForm.curriculumReference ? {} : { curriculumReference: undefined }) });
      setConceptForm(v => ({ ...v, conceptKey: '', title: '', learningObjective: '', curriculumReference: '', orderIndex: v.orderIndex + 1 })); setMessage('Concept created.'); await loadCurriculum();
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not create concept.'); }
    finally { setBusy(''); }
  };

  const upload = async (resourceId: string, file?: File, suppliedDuration?: number): Promise<boolean> => {
    if (!file) return false;
    setError(''); setMessage(''); setBusy(resourceId);
    try {
      const seconds = suppliedDuration ?? (duration[resourceId] ? Number(duration[resourceId]) : undefined);
      const intent = await api.createAdminLearningUploadIntent(resourceId, file, seconds);
      const uploaded = await fetch(intent.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type, 'x-upsert': 'false' }, body: file });
      if (!uploaded.ok) throw new Error(`Storage upload failed (${uploaded.status}). Check bucket configuration and file-size limits.`);
      await api.saveAdminLearningFile(resourceId, {
        storageBucket: intent.storageBucket, storagePath: intent.storagePath, mimeType: intent.mimeType,
        fileSizeBytes: intent.fileSizeBytes, ...(intent.durationSeconds ? { durationSeconds: intent.durationSeconds } : {})
      });
      setMessage(`Uploaded ${file.name}. It is now waiting for teacher review.`);
      setStatus('PENDING_REVIEW'); setItems(await api.listAdminLearningResources('PENDING_REVIEW'));
      return true;
    } catch (e) { setError(e instanceof ApiError ? e.message : (e instanceof Error ? e.message : 'Upload failed.')); return false; }
    finally { setBusy(''); }
  };

  const createResource = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resourceFile) { setError('Choose the resource file before submitting.'); return; }
    setBusy('create-resource'); setError(''); setMessage('');
    try {
      const created = await api.createAdminLearningResource({ conceptId: resourceForm.conceptId, pathwayCode: resourceForm.pathwayCode, format: resourceForm.format, title: resourceForm.title.trim(), ...(resourceForm.sourceReference.trim() ? { sourceReference: resourceForm.sourceReference.trim() } : {}) });
      setResourceForm(v => ({ ...v, title: '', sourceReference: '' }));
      const file = resourceFile; setResourceFile(null);
      setBusy('');
      const seconds = duration['new'] ? Number(duration['new']) : undefined;
      const uploaded = await upload(created.id, file, seconds);
      setDuration(v => ({ ...v, new: '' }));
      if (!uploaded) { setStatus('DRAFT'); setItems(await api.listAdminLearningResources('DRAFT')); setMessage('Resource details were saved as a draft. Select the file again from the Draft list to retry its upload.'); }
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Could not create the resource.'); setBusy(''); }
  };

  const publish = async (resource: Resource) => {
    setBusy(resource.id); setError(''); setMessage('');
    try { await api.publishAdminLearningResource(resource.id); setMessage(`Published “${resource.title}”.`); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not publish this resource.'); }
    finally { setBusy(''); }
  };

  const accept = (format: Resource['format']) => format === 'VIDEO' ? 'video/*' : format === 'IMAGE' ? 'image/jpeg,image/png,image/webp,image/gif' : 'application/pdf';
  const availableConcepts = chapters.flatMap(chapter => chapter.concepts.map(concept => ({ ...concept, chapter })));

  return <div style={{ maxWidth: 1050, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h1>Learning Resources</h1><p style={{ color: '#64748b' }}>Enter the details and upload the file. The assigned teacher reviews it before you publish it to students.</p></div><button className="btn btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button></div>
    <div style={{ display: 'flex', gap: '.5rem', margin: '1rem 0' }}><button className={`btn ${tab === 'resources' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('resources')}>Resources</button><button className={`btn ${tab === 'curriculum' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('curriculum')}>Curriculum</button></div>
    {error && <div className="alert alert-error" role="alert">{error}</div>}{message && <div className="alert" role="status">{message}</div>}
    {tab === 'curriculum' ? <>
      <section className="card" style={{ padding: '1.25rem', margin: '1rem 0' }}><h2>Add chapter</h2>
        {!subjects.length ? <p>No subjects exist yet. Add the required subjects first.</p> : <form className="admin-horizontal-form" onSubmit={createChapter}>
          <label>Subject<SelectField ariaLabel="Subject" value={chapterForm.subjectId} onChange={value => setChapterForm({ ...chapterForm, subjectId: value })} options={subjects.map(s => ({ value: s.id, label: s.name }))} /></label>
          <label>Grade<SelectField ariaLabel="Grade" value={chapterForm.grade} onChange={value => setChapterForm({ ...chapterForm, grade: Number(value) })} options={[6,7,8].map(g => ({ value: g, label: `Grade ${g}` }))} /></label>
          <label>Term<SelectField ariaLabel="Term" value={chapterForm.term} onChange={value => setChapterForm({ ...chapterForm, term: Number(value) })} options={[1,2,3].map(term => ({ value: term, label: `Term ${term}` }))} /></label>
          <label>Chapter title<input required maxLength={200} value={chapterForm.title} onChange={e => setChapterForm({ ...chapterForm, title: e.target.value })} /></label>
          <label>Chapter Number<input type="number" min="0" required value={chapterForm.orderIndex} onChange={e => setChapterForm({ ...chapterForm, orderIndex: Number(e.target.value) })} /></label>
          <label>Textbook reference (optional)<input value={chapterForm.curriculumReference} onChange={e => setChapterForm({ ...chapterForm, curriculumReference: e.target.value })} /></label>
          <label>Description (optional)<input value={chapterForm.description} onChange={e => setChapterForm({ ...chapterForm, description: e.target.value })} /></label>
          <div style={{ alignSelf: 'end' }}><button className="btn btn-primary" disabled={busy === 'curriculum'}>Create chapter</button></div>
        </form>}
      </section>
      {chapters.length > 0 && <section className="card" style={{ padding: '1.25rem', margin: '1rem 0' }}><h2>Add concept</h2>
        <form className="admin-horizontal-form" onSubmit={createConcept}>
          <label>Chapter<SelectField ariaLabel="Chapter" value={conceptForm.chapterId} onChange={value => setConceptForm({ ...conceptForm, chapterId: value })} options={chapters.map(c => ({ value: c.id, label: `Grade ${c.grade} · ${c.subject.name} · ${c.title}` }))} /></label>
          <label>Concept key<input required maxLength={100} value={conceptForm.conceptKey} onChange={e => setConceptForm({ ...conceptForm, conceptKey: e.target.value })} /></label>
          <label>Concept title<input required maxLength={200} value={conceptForm.title} onChange={e => setConceptForm({ ...conceptForm, title: e.target.value })} /></label>
          <label>Difficulty<SelectField ariaLabel="Difficulty" value={conceptForm.difficulty} onChange={value => setConceptForm({ ...conceptForm, difficulty: value as typeof conceptForm.difficulty })} options={[{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'CHALLENGING', label: 'Challenging' }]} /></label>
          <label>Order<input type="number" min="0" required value={conceptForm.orderIndex} onChange={e => setConceptForm({ ...conceptForm, orderIndex: Number(e.target.value) })} /></label>
          <label>Objective (optional)<input value={conceptForm.learningObjective} onChange={e => setConceptForm({ ...conceptForm, learningObjective: e.target.value })} /></label>
          <label>Textbook reference (optional)<input value={conceptForm.curriculumReference} onChange={e => setConceptForm({ ...conceptForm, curriculumReference: e.target.value })} /></label>
          <div style={{ alignSelf: 'end' }}><button className="btn btn-primary" disabled={busy === 'curriculum'}>Create concept</button></div>
        </form>
      </section>}
      <h2>Configured chapters</h2>
      {chapters.map(chapter => <div className="card" key={chapter.id} style={{ padding: '1rem', margin: '.5rem 0' }}>Grade {chapter.grade} · Term {chapter.term ?? 'not set'} · {chapter.subject.name} · Chapter {chapter.orderIndex}: {chapter.title} · {chapter._count.concepts} concepts</div>)}
    </> : <>
    <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', margin: '1rem 0' }}>Filter status
      <SelectField ariaLabel="Filter resource status" value={status} onChange={setStatus} options={[{ value: 'PENDING_REVIEW', label: 'Pending teacher review' }, { value: 'DRAFT', label: 'Draft / upload retry' }, { value: 'APPROVED', label: 'Approved to publish' }, { value: 'PUBLISHED', label: 'Published' }, { value: 'NEEDS_REVISION', label: 'Needs revision' }, { value: 'REJECTED', label: 'Rejected' }, { value: 'ARCHIVED', label: 'Archived' }]} />
    </label>
    <section className="card" style={{ padding: '1.25rem', margin: '1rem 0' }}>
      <h2>Create resource and upload</h2>
      <p style={{ color: '#64748b' }}>Enter the resource details and upload its file. The assigned teacher reviews the uploaded resource before it can be published.</p>
      {!availableConcepts.length ? <p>Add chapters and concepts in the Curriculum tab first.</p> : <form className="admin-horizontal-form" onSubmit={createResource}>
        <label>Curriculum concept<SelectField required ariaLabel="Curriculum concept" value={resourceForm.conceptId} onChange={value => setResourceForm({ ...resourceForm, conceptId: value })} options={availableConcepts.map(option => ({ value: option.id, label: `Grade ${option.chapter.grade} · ${option.chapter.subject.name} · ${option.chapter.title} · ${option.title}` }))} /></label>
        <label>Resource title<input required maxLength={200} value={resourceForm.title} onChange={e => setResourceForm({ ...resourceForm, title: e.target.value })} /></label>
        <label>Format<SelectField ariaLabel="Resource format" value={resourceForm.format} onChange={value => setResourceForm({ ...resourceForm, format: value as typeof resourceForm.format })} options={[{ value: 'VIDEO', label: 'Video' }, { value: 'IMAGE', label: 'Image' }, { value: 'PDF', label: 'PDF' }]} /></label>
        <label>Learning pathway<SelectField ariaLabel="Learning pathway" value={resourceForm.pathwayCode} onChange={value => setResourceForm({ ...resourceForm, pathwayCode: value as typeof resourceForm.pathwayCode })} options={[{ value: 'VIS', label: 'Visual' }, { value: 'LING', label: 'Linguistic' }, { value: 'LOGI', label: 'Logical-Mathematical' }]} /></label>
        <label>Source reference (optional)<input maxLength={2000} value={resourceForm.sourceReference} onChange={e => setResourceForm({ ...resourceForm, sourceReference: e.target.value })} /></label>
        {resourceForm.format === 'VIDEO' && <label>Duration (seconds, optional)<input type="number" min="1" value={duration['new'] || ''} onChange={e => setDuration({ ...duration, new: e.target.value })} /></label>}
        <label>File (max {resourceForm.format === 'VIDEO' ? '200' : resourceForm.format === 'IMAGE' ? '10' : '20'} MB)<input required type="file" accept={accept(resourceForm.format)} onChange={e => setResourceFile(e.currentTarget.files?.[0] || null)} /></label>
        <div style={{ alignSelf: 'end' }}><button className="btn btn-primary" disabled={busy === 'create-resource' || !resourceForm.conceptId || !resourceFile}>{busy === 'create-resource' ? 'Saving resource…' : 'Submit resource for teacher review'}</button></div>
      </form>}
    </section>
    {!items.length && !error && <div className="card" style={{ padding: '1.5rem' }}>No resources in this status.</div>}
    {items.map(item => <article className="card" key={item.id} style={{ padding: '1.25rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div><h2 style={{ margin: 0 }}>{item.title}</h2><p>{item.concept.chapter.subject.name} · Grade {item.concept.chapter.grade} · {item.concept.chapter.title} · {item.concept.title}</p><p>{item.format} · {item.pathway.name} · Status: <strong>{item.status}</strong></p></div>{item.storagePath && <div><small>Object key: {item.storagePath}</small><br /><small>{item.fileSizeBytes ? formatBytes(item.fileSizeBytes) : ''} {item.mimeType}</small></div>}</div>
      {(item.status === 'DRAFT' || item.status === 'APPROVED') && <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '.5rem' }}>
        {item.status === 'DRAFT' ? <label className="btn btn-secondary" style={{ cursor: busy === item.id ? 'wait' : 'pointer' }}><CloudUpload size={16} /> {busy === item.id ? 'Uploading…' : `Choose ${item.format.toLowerCase()} (max ${item.format === 'VIDEO' ? '200' : item.format === 'IMAGE' ? '10' : '20'} MB)`}
          <input type="file" accept={accept(item.format)} disabled={busy === item.id} style={{ display: 'none' }} onChange={e => void upload(item.id, e.currentTarget.files?.[0])} /></label> : <button className="btn btn-primary" disabled={busy === item.id} onClick={() => void publish(item)}><Check size={16} /> Publish to students</button>}
      </div>}
    </article>)}
    </>}
  </div>;
};
