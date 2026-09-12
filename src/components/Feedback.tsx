import { useState } from 'react';
import { ArrowRight, Check, CheckCheck, Lightbulb, MessageCircle, PencilLine, Sparkles, Target, TrendingUp } from 'lucide-react';
import type { Correction, EnglishAnalysisResult, Scores } from '../types';
import { countDemonstratedFixes, mapCorrections } from '../lib/analysis';

export function CorrectionDetails({ correction }: { correction: Correction }) {
  return <div className="correction-details" role="region" aria-label="Correction explanation">
    <span className={`pill ${correction.correctionType === 'error' ? 'teacher-pill' : ''}`}>{correction.correctionType === 'error' ? 'A small correction' : 'Sounds more natural'}</span>
    <div className="correction-words"><div><span>You said</span><del>{correction.originalText}</del></div><ArrowRight size={18} /><div><span>{correction.replacementText ? 'Use' : 'Leave out'}</span><strong>{correction.replacementText || 'This extra word'}</strong></div></div>
    <h4><Lightbulb size={17} /> Why?</h4><p>{correction.simpleExplanation}</p>
  </div>;
}
export function TeacherNotebook({ analysis, compact = false }: { analysis: EnglishAnalysisResult; compact?: boolean }) {
  const [version, setVersion] = useState<'yours' | 'teacher'>('yours');
  const [selected, setSelected] = useState<string | null>(analysis.corrections[0]?.id ?? null);
  const { mapped, unmapped } = mapCorrections(analysis.originalTranscript, analysis.corrections);
  const selectedCorrection = analysis.corrections.find(c => c.id === selected);
  let cursor = 0;
  const fragments = mapped.map(({ correction, start, end }) => {
    const before = analysis.originalTranscript.slice(cursor, start); cursor = end;
    return <span key={correction.id}>{before}<button type="button" className={`correction-mark ${selected === correction.id ? 'selected' : ''} ${correction.correctionType === 'natural_improvement' ? 'natural' : ''}`} onClick={() => setSelected(correction.id)} aria-pressed={selected === correction.id} aria-label={`${correction.correctionType === 'error' ? 'Correction' : 'Optional improvement'}: ${correction.originalText} → ${correction.replacementText || 'remove'}. Show explanation.`}><span className="replacement">{correction.replacementText || 'remove'}<span className="hand-arrow">↙</span></span><span className="original-word">{analysis.originalTranscript.slice(start, end)}</span></button></span>;
  });
  return <div className={`notebook-layout ${compact ? 'notebook-compact' : ''}`}>
    <div className="notebook-wrap"><div className="notebook-toolbar"><div className="segmented" aria-label="Transcript version"><button className={version === 'yours' ? 'active' : ''} aria-pressed={version === 'yours'} onClick={() => setVersion('yours')}>Your version</button><button className={version === 'teacher' ? 'active' : ''} aria-pressed={version === 'teacher'} onClick={() => setVersion('teacher')}>Teacher’s version</button></div><PencilLine size={19} /></div>
      <div className="notebook"><div className="notebook-label">{version === 'yours' ? 'A little practice. A little progress.' : 'The same you. A little clearer.'}</div><div className={`transcript ${version === 'teacher' ? 'clean-transcript' : ''}`}>{version === 'teacher' ? analysis.correctedTranscript : <>{fragments}{analysis.originalTranscript.slice(cursor)}</>}</div><div className="notebook-foot">{version === 'yours' && analysis.corrections.length > 0 ? 'Tap a marked phrase to understand why.' : <><CheckCheck size={17} /> {version === 'teacher' ? 'Keep your meaning. Learn the difference.' : 'No corrections suggested for this attempt.'}</>}</div></div>
      {unmapped.length > 0 && <div className="unmapped"><p>Additional suggestions — shown separately to avoid marking the wrong words.</p>{unmapped.map(c => <button key={c.id} className="text-button" onClick={() => setSelected(c.id)}>{c.originalText} <ArrowRight size={15} /> {c.replacementText || '(remove)'}</button>)}</div>}
    </div>
    {!compact && <aside>{selectedCorrection ? <CorrectionDetails correction={selectedCorrection} /> : <div className="correction-details"><CheckCheck className="blue" /><h3>Room to keep growing</h3><p>{analysis.focusNext}</p></div>}{analysis.corrections.length > 1 && <div className="correction-selector" aria-label="Choose a correction">{analysis.corrections.map((c, i) => <button key={c.id} aria-label={`Show correction ${i + 1}`} aria-pressed={selected === c.id} className={selected === c.id ? 'selected' : ''} onClick={() => setSelected(c.id)}>{i + 1}</button>)}</div>}</aside>}
    {compact && selectedCorrection && <CorrectionDetails correction={selectedCorrection} />}
  </div>;
}
export function ScoreCards({ scores, remark }: { scores: Scores; remark: string }) { return <div className="score-grid">{(['grammar', 'vocabulary', 'clarity', 'overall'] as const).map(key => <div className={`score-card ${key === 'overall' ? 'overall' : ''}`} key={key}><span className="capitalize">{key === 'overall' && <Sparkles size={16} />} {key}</span><strong>{scores[key].toFixed(1)}<small>/ 10</small></strong>{key === 'overall' ? <span className="score-remark">{remark}</span> : <div className="score-track"><span style={{ width: `${scores[key] * 10}%` }} /></div>}</div>)}</div>; }
export function TeacherSummary({ analysis }: { analysis: EnglishAnalysisResult }) { return <div className="teacher-summary"><div className="teacher-note"><div className="section-icon"><MessageCircle size={22} /></div><div><h3>A note from your teacher</h3><p>{analysis.teacherFeedback}</p></div></div><div className="strengths-focus">{analysis.strengths.length > 0 && <div><h3><Check size={18} /> You did well</h3>{analysis.strengths.map(strength => <p className="strength" key={strength}><Check size={15} /> {strength}</p>)}</div>}<div className="focus-next"><h3><Target size={18} /> Focus next</h3><p>{analysis.focusNext}</p></div></div></div>; }
export function AttemptComparison({ previous, current }: { previous: EnglishAnalysisResult; current: EnglishAnalysisResult }) {
  const delta = Math.round((current.scores.overall - previous.scores.overall) * 10) / 10;
  const fixes = countDemonstratedFixes(previous, current);
  return <div className="comparison"><TrendingUp size={24} /><div><h3>{delta > 0 ? 'Your practice is moving forward.' : delta === 0 ? 'You are building consistency.' : 'Every attempt gives you something to learn.'}</h3><p>Previous {previous.scores.overall.toFixed(1)} <ArrowRight size={14} /> This attempt {current.scores.overall.toFixed(1)} <strong>{delta > 0 ? '+' : ''}{delta.toFixed(1)} points</strong></p>{fixes > 0 && <p>{fixes} taught {fixes === 1 ? 'replacement used' : 'replacements used'} correctly in this attempt.</p>}</div></div>;
}
