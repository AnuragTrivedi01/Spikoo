import { database } from './supabaseClient';
import type { AttemptDraft, Correction, EnglishAnalysisResult, HistorySession, PracticeAttempt, PracticeSession } from '../types';
export async function saveAttempt(draft: AttemptDraft): Promise<{ attempt_number: number; id: string }> {
  const { data, error } = await database().rpc('save_practice_attempt', { p_payload: {
    id: draft.id, session_id: draft.sessionId, topic_id: draft.topic.id, topic: draft.topic.text,
    topic_category: draft.topic.category, difficulty: draft.topic.level, duration_seconds: draft.durationSeconds,
    completed_at: draft.completedAt, timezone: draft.timezone, analysis: draft.analysis,
  } });
  if (error) throw new Error('Your feedback is ready, but we could not save it. Keep this page open and try saving again.');
  return data as { attempt_number: number; id: string };
}
const sessionFields = 'id,user_id,topic_id,topic,topic_category,difficulty,created_at,completed_at';
export async function getHistory(page = 0) {
  const { data, error } = await database().from('practice_sessions')
    .select(`${sessionFields},practice_attempts(id,attempt_number,overall_score,created_at)`)
    .order('completed_at', { ascending: false }).range(page * 12, page * 12 + 12);
  if (error) throw new Error('Your practice history could not load. Please try again.');
  const rows = (data ?? []) as HistorySession[];
  return { sessions: rows.slice(0, 12), hasMore: rows.length > 12 };
}
export async function getRecentTopicIds() {
  const { data, error } = await database().from('practice_sessions').select('topic_id').order('completed_at', { ascending: false }).limit(16);
  if (error) throw new Error('Recent topics could not load. Please try again.');
  return data.map(row => row.topic_id as string);
}
export async function getSession(id: string): Promise<{ session: PracticeSession; attempts: PracticeAttempt[] }> {
  const db = database();
  const [sessionResult, attemptsResult] = await Promise.all([
    db.from('practice_sessions').select(sessionFields).eq('id', id).single(),
    db.from('practice_attempts').select('id,session_id,attempt_number,duration_seconds,created_at,completed_at,original_transcript,corrected_transcript,grammar_score,vocabulary_score,clarity_score,overall_score,remark,teacher_feedback,strengths,focus_next,corrections(id,sentence_id,original_text,occurrence,replacement_text,simple_explanation,category,severity,correction_type,ordinal)').eq('session_id', id).order('attempt_number'),
  ]);
  if (sessionResult.error || attemptsResult.error) throw new Error('This practice session could not load. It may not be available in your account.');
  const attempts = attemptsResult.data.map(row => ({
    id: row.id, session_id: row.session_id, attempt_number: row.attempt_number,
    duration_seconds: row.duration_seconds, created_at: row.created_at, completed_at: row.completed_at,
    analysis: {
      originalTranscript: row.original_transcript, correctedTranscript: row.corrected_transcript,
      scores: { grammar: row.grammar_score, vocabulary: row.vocabulary_score, clarity: row.clarity_score, overall: row.overall_score },
      remark: row.remark, teacherFeedback: row.teacher_feedback, strengths: row.strengths, focusNext: row.focus_next,
      corrections: row.corrections.sort((a, b) => a.ordinal - b.ordinal).map(c => ({ id: c.id, sentenceId: c.sentence_id, originalText: c.original_text, occurrence: c.occurrence, replacementText: c.replacement_text, simpleExplanation: c.simple_explanation, category: c.category, severity: c.severity, correctionType: c.correction_type }) as Correction),
    } as EnglishAnalysisResult,
  }));
  return { session: sessionResult.data as PracticeSession, attempts };
}
