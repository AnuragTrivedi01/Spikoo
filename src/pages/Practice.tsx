import { useEffect, useRef, useState } from 'react';
import { useBlocker, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CircleCheck, Clock3, Flame, Headphones, Lightbulb, LoaderCircle, LockKeyhole, Mic, PencilLine, RefreshCw, RotateCcw, ShieldCheck, Sparkles, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRecorder } from '../hooks/useRecorder';
import { chooseTopic, topics } from '../data/topics';
import type { AttemptDraft, EnglishAnalysisResult, PracticeAttempt, Topic } from '../types';
import { getRecentTopicIds, getSession, saveAttempt } from '../services/practiceService';
import { authorizePuter, loadPuter, puterError } from '../services/puterService';
import { transcribeRecording } from '../services/transcriptionService';
import { analyzeEnglish } from '../services/englishAnalysisService';
import { formatDuration } from '../lib/dates';
import { AudioPreview } from '../components/AudioPreview';
import { AttemptComparison, ScoreCards, TeacherNotebook, TeacherSummary } from '../components/Feedback';
type Phase = 'record' | 'authorize' | 'processing' | 'results';
export default function Practice() {
  const { profile, preferences } = useAuth(); const [params, setParams] = useSearchParams(); const retryId = params.get('session');
  const recorder = useRecorder(); const [topic, setTopic] = useState<Topic | null>(null); const [sessionId, setSessionId] = useState('');
  const [previous, setPrevious] = useState<PracticeAttempt[]>([]); const [recent, setRecent] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>('record'); const [busy, setBusy] = useState(false); const [stage, setStage] = useState(0);
  const [transcript, setTranscript] = useState(''); const [result, setResult] = useState<EnglishAnalysisResult | null>(null);
  const [draft, setDraft] = useState<AttemptDraft | null>(null); const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false); const [attemptNumber, setAttemptNumber] = useState(1);
  const [error, setError] = useState(''); const [initError, setInitError] = useState(''); const [loadKey, setLoadKey] = useState(0);
  const [sdkReady, setSdkReady] = useState(false); const [sdkError, setSdkError] = useState('');
  const active = useRef(true); const analysisLock = useRef(false); const saveLock = useRef(false); const originalDuration = useRef(0);
  const allowTopicChange = useRef(false);
  const dirty = recorder.state !== 'idle' || busy || Boolean(result && !saved);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => !allowTopicChange.current && dirty && (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  const navigationGuard = blocker.state === 'blocked' ? <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="leave-title"><h2 id="leave-title">Keep this small step?</h2><p>Your unsaved recording and feedback will be discarded if you leave this page.</p><div className="modal-actions"><button className="button button-outline" autoFocus onClick={() => blocker.reset()}>Stay here</button><button className="button button-primary" onClick={() => { active.current = false; recorder.reset(); blocker.proceed(); }}>Leave practice</button></div></div></div> : null;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false; setInitError(''); setTopic(null);
    async function initialize() {
      try {
        if (retryId) {
          const data = await getSession(retryId); if (cancelled) return;
          const known = topics.find(t => t.id === data.session.topic_id);
          setTopic({ id: data.session.topic_id, text: data.session.topic, category: data.session.topic_category, level: data.session.difficulty, prompts: known?.prompts ?? ['Give a specific example.', 'Explain what happened.', 'Share how you felt.'] });
          setSessionId(data.session.id); setPrevious(data.attempts); setAttemptNumber((data.attempts.at(-1)?.attempt_number ?? 0) + 1);
        } else {
          const ids = await getRecentTopicIds(); if (cancelled) return;
          const next = chooseTopic(profile!.english_level, ids); setTopic(next); setRecent([next.id, ...ids]); setSessionId(crypto.randomUUID()); setPrevious([]); setAttemptNumber(1);
        }
      } catch (e) { if (!cancelled) setInitError(e instanceof Error ? e.message : 'Practice could not load.'); }
    }
    void initialize(); return () => { cancelled = true; };
  }, [retryId, profile?.english_level, loadKey]);
  useEffect(() => {
    const dirty = recorder.state !== 'idle' || busy || (result && !saved);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    if (dirty) window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [recorder.state, busy, result, saved]);
  const prepareAI = () => { setSdkError(''); void loadPuter().then(() => { if (active.current) setSdkReady(true); }).catch(e => { if (active.current) setSdkError(e instanceof Error ? e.message : 'AI access could not load.'); }); };
  useEffect(() => { if (phase === 'authorize') prepareAI(); }, [phase]);
  const resetAttempt = () => { recorder.reset(); setTranscript(''); setResult(null); setDraft(null); setSaved(false); setError(''); setPhase('record'); setStage(0); };
  function changeTopic() {
    if (busy || saving || recorder.state === 'recording' || recorder.state === 'requesting') return;
    if ((recorder.blob || (result && !saved)) && !window.confirm('Start a new topic? Your unsaved recording and feedback will be discarded.')) return;
    resetAttempt(); setPrevious([]); setAttemptNumber(1);
    if (retryId) { allowTopicChange.current = true; setParams({}); return; }
    const next = chooseTopic(profile!.english_level, recent); setTopic(next); setRecent(ids => [next.id, ...ids].slice(0, 24)); setSessionId(crypto.randomUUID());
  }
  async function persist(value: AttemptDraft) {
    if (saveLock.current) return; saveLock.current = true; setSaving(true); setError('');
    try { const response = await saveAttempt(value); if (active.current) { setSaved(true); setAttemptNumber(response.attempt_number); } }
    catch (e) { if (active.current) setError(e instanceof Error ? e.message : 'Your feedback could not be saved. Please try again.'); }
    finally { saveLock.current = false; if (active.current) setSaving(false); }
  }
  async function runAnalysis() {
    if (!topic || analysisLock.current || (!recorder.blob && !transcript)) return;
    analysisLock.current = true; setBusy(true); setError(''); setPhase('processing');
    originalDuration.current = recorder.duration || originalDuration.current;
    try {
      let recognized = transcript;
      if (!recognized) { setStage(0); recognized = await transcribeRecording(recorder.blob!); if (!active.current) return; setTranscript(recognized); }
      setStage(1);
      if (!active.current) return;
      const analysis = await analyzeEnglish(recognized, topic); if (!active.current) return;
      const value: AttemptDraft = { id: crypto.randomUUID(), sessionId, topic, durationSeconds: originalDuration.current, completedAt: recorder.completedAt || new Date().toISOString(), timezone: preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, analysis };
      setResult(analysis); setDraft(value); setStage(2); setPhase('results'); recorder.reset();
      await persist(value);
    } catch (e) { if (active.current) { setError(e instanceof Error ? e.message : 'Spikoo could not finish checking this attempt. Please try again.'); setPhase('record'); } }
    finally { analysisLock.current = false; if (active.current) setBusy(false); }
  }
  function requestAnalysis() { if (!navigator.onLine) { setError('You are offline. Reconnect before analyzing. Your recording stays in this page.'); return; } if (window.puter?.auth.isSignedIn()) void runAnalysis(); else setPhase('authorize'); }
  function connectAI() {
    if (busy) return; setError('');
    // Start popup synchronously from this click, before other asynchronous work.
    const authorization = authorizePuter(); setBusy(true);
    void authorization.then(() => { if (active.current) { setBusy(false); return runAnalysis(); } }).catch(e => { if (active.current) { setError(puterError(e, 'AI access was not enabled. Please try again.')); setBusy(false); } });
  }
  function tryAgain() {
    if (!saved || !result || !draft) return;
    setPrevious(items => [...items, { id: draft.id, session_id: sessionId, attempt_number: attemptNumber, duration_seconds: draft.durationSeconds, created_at: draft.completedAt, completed_at: draft.completedAt, analysis: result }]);
    setAttemptNumber(attemptNumber + 1); resetAttempt();
  }
  if (initError) return <div className="empty-state"><h2>Your practice needs a moment.</h2><p>{initError}</p><button className="button button-primary" onClick={() => setLoadKey(k => k + 1)}>Try again</button></div>;
  if (!topic) return <div className="loading-page" role="status"><img src="/assets/spikoo-icon.png" width={70} alt="" /><p>Finding a topic for you…</p></div>;
  if (phase === 'results' && result) return <>{navigationGuard}<section aria-label="Your English feedback"><div className="results-topline"><CircleCheck size={18} /> Your feedback is ready <span>·</span> Attempt {attemptNumber}</div><div className="page-heading"><div><h1>A little clearer. A little more you.</h1><p>Take one idea from this feedback into your next attempt.</p></div></div><p className="results-topic">{topic.text}</p><ScoreCards scores={result.scores} remark={result.remark} />{previous.length > 0 && <AttemptComparison previous={previous.at(-1)!.analysis} current={result} />}<div className="feedback-heading"><h2><PencilLine size={20} /> Your teacher’s notebook</h2><span>{result.corrections.filter(c => c.correctionType === 'error').length} corrections · {result.corrections.filter(c => c.correctionType === 'natural_improvement').length} natural improvements</span></div><TeacherNotebook key={draft?.id} analysis={result} /><TeacherSummary analysis={result} />{error && <div className="notice" role="alert"><span>{error}</span><button className="button button-outline" disabled={saving} onClick={() => draft && void persist(draft)}>{saving ? 'Saving…' : 'Retry saving'}</button></div>}{saving && <p className="save-state" role="status"><LoaderCircle className="spinner" size={15} /> Saving your progress…</p>}{saved && <><p className="save-state" role="status"><Check size={15} /> Saved to your practice history</p><div className="streak-celebration"><Flame size={23} /><p>You showed up today. This practice counts toward your streak.</p></div></>}<div className="results-actions"><button className="button button-primary" onClick={tryAgain} disabled={!saved || saving}><RotateCcw size={17} /> Try the same topic again</button><button className="button button-outline" onClick={changeTopic} disabled={saving}>Next topic <ArrowRight size={17} /></button></div></section></>;
  const processingLabels = ['Preparing and transcribing your recording…', 'Your teacher is checking your English…', 'Your feedback is ready.'];
  return <>{navigationGuard}<div className="page-heading"><div><span className="kicker">YOUR SPACE TO SPEAK</span><h1>Let’s find your voice, {profile?.display_name.split(' ')[0] || 'learner'}.</h1><p>A small conversation today. A little more confidence tomorrow.</p></div><div className="greeting-tag"><Flame size={18} /> One small step at a time</div></div><div className="practice-layout"><div className="practice-main"><div className="topic-card"><div className="topic-top"><span className="kicker">{previous.length ? 'SAME TOPIC · NEW POSSIBILITIES' : 'TODAY’S TOPIC'}</span><button className="text-button" onClick={changeTopic} disabled={busy || phase === 'processing' || recorder.state === 'recording' || recorder.state === 'requesting'}><RefreshCw size={14} /> Change topic</button></div><h2>{topic.text}</h2><div className="topic-meta"><span className="pill capitalize">{topic.level}</span><span>{topic.category}</span><span>·</span><Clock3 size={13} /><span>1–3 minutes</span>{attemptNumber > 1 && <><span>·</span><span>Attempt {attemptNumber}</span></>}</div></div><div className="recording-space">{phase === 'processing' ? <div className="processing-state" role="status" aria-live="polite"><h3>A little feedback is on its way.</h3><ol>{processingLabels.map((label, index) => <li key={label} className={index === stage ? 'active' : index < stage ? 'done' : ''}><span>{index < stage ? <Check size={15} /> : index === stage ? <LoaderCircle className="spinner" size={15} /> : index + 1}</span>{label}</li>)}</ol></div> : phase === 'authorize' ? <div className="puter-enable"><ShieldCheck size={31} /><h3>Enable AI feedback</h3><p>Spikoo uses Puter to process your recording and generate AI teacher feedback, without an AI API key. Your Spikoo account stays separate.</p><button className="button button-primary" disabled={!sdkReady || busy} onClick={connectAI}>{busy ? 'Connecting…' : sdkReady ? 'Continue with Puter' : 'Loading AI access…'}<ArrowRight size={17} /></button><p className="allowance-note">Uses your Puter account’s available AI allowance. You choose when to send your recording.</p>{sdkError && <div className="notice" role="alert">{sdkError}<button className="text-button" onClick={prepareAI}>Try loading again</button></div>}<button className="text-button" disabled={busy} onClick={() => setPhase('record')}>Back to my recording</button></div> : recorder.state === 'recorded' ? <AudioPreview key={recorder.url} url={recorder.url} duration={recorder.duration} busy={busy} onAgain={resetAttempt} onAnalyze={requestAnalysis} /> : <>{recorder.state === 'recording' && <><div className="recording-status" role="status">Recording · Speak naturally</div><div className="waveform" aria-hidden="true">{recorder.levels.map((height, index) => <span key={index} style={{ height }} />)}</div><p className="recording-timer" aria-label={`${recorder.duration} seconds recorded`}>{formatDuration(recorder.duration)}</p></>}<button className={`mic-button ${recorder.state === 'recording' ? 'recording' : ''}`} disabled={recorder.state === 'requesting' || busy} onClick={() => recorder.state === 'recording' ? recorder.stop() : void recorder.start()} aria-label={recorder.state === 'recording' ? 'Stop recording' : recorder.state === 'requesting' ? 'Waiting for microphone permission' : 'Start recording'}>{recorder.state === 'recording' ? <Square fill="currentColor" size={25} /> : recorder.state === 'requesting' ? <LoaderCircle className="spinner" /> : <Mic />}</button><h3>{recorder.state === 'recording' ? 'Tap to stop when you’re ready' : recorder.state === 'requesting' ? 'Allow your microphone to begin' : 'Tap to start speaking'}</h3><p>{recorder.state === 'recording' ? 'You can speak for up to 5 minutes. Take your time.' : 'Take a breath. There’s no perfect way to begin.'}</p></>}</div>{(error || recorder.error) && <div className="notice" role="alert" style={{ margin: '0 24px 24px' }}>{error || recorder.error}</div>}{transcript && phase !== 'processing' && <details className="transcript-review"><summary>What we heard — original transcript</summary><p>{transcript}</p><p>Your words are preserved. Retrying feedback uses this transcript again.</p></details>}<div className="recording-footnote"><LockKeyhole size={12} /> Your audio stays here until you choose to analyze.</div></div><aside className="practice-aside"><div className="tip-card"><h3><Lightbulb /> A little inspiration</h3><p>Not sure where to start? Try these:</p><ol>{topic.prompts.map(prompt => <li key={prompt}>{prompt}</li>)}</ol></div><div className="tip-card"><h3><Headphones size={18} /> Your practice, step by step</h3>{['Speak your thoughts', 'Listen to your recording', 'Learn from your feedback'].map((label, index) => <div className={`number-step ${index === (phase === 'processing' ? 2 : recorder.state === 'recorded' ? 1 : 0) ? 'current' : ''}`} key={label}><span>{index + 1}</span>{label}</div>)}</div><div className="small-motivation">Small steps.<br />Bigger possibilities. <Sparkles size={18} /></div></aside></div></>;
}


