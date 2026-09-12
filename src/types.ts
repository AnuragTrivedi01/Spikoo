export type EnglishLevel = 'beginner' | 'intermediate' | 'advanced';
export type Theme = 'light' | 'dark' | 'system';
export interface Profile { user_id: string; display_name: string; english_level: EnglishLevel; onboarding_completed: boolean; created_at: string }
export interface UserPreferences { user_id: string; theme: Theme; timezone: string }
export interface Topic { id: string; text: string; category: string; level: EnglishLevel; prompts: string[] }
export interface Scores { grammar: number; vocabulary: number; clarity: number; overall: number }
export interface Correction {
  id: string; sentenceId: string; originalText: string; occurrence: number;
  replacementText: string; simpleExplanation: string;
  category: 'grammar' | 'vocabulary' | 'clarity' | 'word_choice' | 'sentence_structure';
  severity: 'minor' | 'important'; correctionType: 'error' | 'natural_improvement';
}
export type Remark = 'Very Bad' | 'Bad' | 'Good' | 'Very Good' | 'Excellent';
export interface EnglishAnalysisResult {
  originalTranscript: string; correctedTranscript: string; corrections: Correction[];
  scores: Scores; remark: Remark; teacherFeedback: string; strengths: string[]; focusNext: string;
}
export interface PracticeSession {
  id: string; user_id: string; topic: string; topic_id: string; topic_category: string;
  difficulty: EnglishLevel; created_at: string; completed_at: string | null;
}
export interface PracticeAttempt {
  id: string; session_id: string; attempt_number: number; duration_seconds: number;
  created_at: string; completed_at: string; analysis: EnglishAnalysisResult;
}
export interface AttemptDraft {
  id: string; sessionId: string; topic: Topic; durationSeconds: number;
  completedAt: string; timezone: string; analysis: EnglishAnalysisResult;
}
export interface DailyActivity { activity_date: string; session_count: number; attempt_count: number; speaking_seconds: number }
export interface UserStats {
  total_sessions: number; total_attempts: number; total_speaking_seconds: number;
  average_grammar_score: number | null; average_vocabulary_score: number | null;
  average_clarity_score: number | null; average_overall_score: number | null;
  current_streak: number; longest_streak: number; practice_days: number;
}
export interface HistorySession extends PracticeSession {
  practice_attempts: { id: string; attempt_number: number; overall_score: number; created_at: string }[];
}
