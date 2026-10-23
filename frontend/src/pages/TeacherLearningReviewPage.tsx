import React, { useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';
import { Check, ExternalLink, RefreshCw, RotateCcw, X } from 'lucide-react';

type ReviewItem = {
  id: string; title: string; format: string; sourceReference: string | null; createdAt: string; mimeType: string | null; fileSizeBytes: number | null; durationSeconds: number | null;
  pathway: { code: string; name: string };
  concept: { title: string; chapter: { title: string; grade: number; subject: { name: string } } };
};
export const TeacherLearningReviewPage: React.FC = () => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    setError('');
    try { setItems(await api.listTeacherLearningReviewQueue()); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not load the review queue.'); }
  };
  useEffect(() => { void load(); }, []);
  const decide = async (item: ReviewItem, decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION') => {
    setBusy(item.id); setError('');
    try { await api.reviewLearningResource(item.id, decision, notes[item.id]); await load(); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Could not submit the review.'); }
    finally { setBusy(''); }
  };
  const openMedia = async (item: ReviewItem) => {
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    try { const result = await api.openTeacherReviewResource(item.id); if (popup) popup.location.replace(result.url); else window.location.assign(result.url); }
    catch (e) { popup?.close(); setError(e instanceof ApiError ? e.message : 'Could not open the resource for review.'); }
  };
  return <div style={{ maxWidth: 1000, margin: '0 auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}><div><h1>Learning Resource Review</h1><p style={{ color: '#64748b' }}>Review the complete resource and its uploaded media for your assigned subjects and grades.</p></div><button className="btn btn-secondary" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button></div>
    {error && <div className="alert alert-error">{error}</div>}
    {!items.length && !error && <section className="card" style={{ padding: '1.5rem' }}>There are no resources waiting for your review.</section>}
    {items.map(item => <article className="card" key={item.id} style={{ padding: '1.25rem', margin: '1rem 0' }}>
      <h2 style={{ marginTop: 0 }}>{item.title}</h2>
      <p>{item.concept.chapter.subject.name} · Grade {item.concept.chapter.grade} · {item.concept.chapter.title} · {item.concept.title}</p>
      <p>Format: {item.format} · Pathway: {item.pathway.name} · {item.mimeType || 'File type pending'}{item.fileSizeBytes ? ` · ${(item.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB` : ''}{item.durationSeconds ? ` · ${item.durationSeconds}s` : ''}</p>
      {item.sourceReference && <p>Source: <a href={item.sourceReference} target="_blank" rel="noreferrer">{item.sourceReference}</a></p>}
      <button className="btn btn-secondary" onClick={() => void openMedia(item)}><ExternalLink size={16} /> View uploaded resource</button>
      <label style={{ display: 'block', margin: '1rem 0' }}>Review notes (optional)
        <textarea value={notes[item.id] || ''} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} rows={3} maxLength={2000} style={{ display: 'block', width: '100%', marginTop: '.4rem' }} />
      </label>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={busy === item.id} onClick={() => void decide(item, 'APPROVED')}><Check size={16} /> Approve for publication</button>
        <button className="btn btn-secondary" disabled={busy === item.id} onClick={() => void decide(item, 'NEEDS_REVISION')}><RotateCcw size={16} /> Request revision</button>
        <button className="btn btn-secondary" disabled={busy === item.id} onClick={() => void decide(item, 'REJECTED')}><X size={16} /> Reject</button>
      </div>
    </article>)}
  </div>;
};
