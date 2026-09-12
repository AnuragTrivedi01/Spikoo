import { z } from 'zod';
import type { Correction, EnglishAnalysisResult, Remark } from '../types';

const shortText = z.string().trim().min(1).max(2000);
export const analysisSchema = z.object({
  originalTranscript: z.string().min(1).max(20000),
  correctedTranscript: z.string().min(1).max(24000).refine(value => value.trim().length > 0),
  corrections: z.array(z.object({
    id: z.string().min(1).max(80), sentenceId: z.string().regex(/^sentence_\d+$/),
    originalText: z.string().min(1).max(2000), occurrence: z.number().int().min(1).max(500),
    replacementText: z.string().max(2000), simpleExplanation: shortText,
    category: z.enum(['grammar', 'vocabulary', 'clarity', 'word_choice', 'sentence_structure']),
    severity: z.enum(['minor', 'important']), correctionType: z.enum(['error', 'natural_improvement']),
  }).strict()).max(100),
  scores: z.object({ grammar: z.number().min(0).max(10), vocabulary: z.number().min(0).max(10), clarity: z.number().min(0).max(10), overall: z.number().min(0).max(10) }).strict(),
  remark: z.enum(['Very Bad', 'Bad', 'Good', 'Very Good', 'Excellent']),
  teacherFeedback: shortText, strengths: z.array(shortText).max(3), focusNext: shortText,
}).strict();

export function remarkFor(score: number): Remark {
  if (score < 3) return 'Very Bad';
  if (score < 5) return 'Bad';
  if (score < 7) return 'Good';
  if (score < 8.5) return 'Very Good';
  return 'Excellent';
}
export interface Sentence { id: string; text: string; start: number; end: number }
export function splitSentences(text: string): Sentence[] {
  const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
  return [...segmenter.segment(text)].map((s, index) => ({ id: `sentence_${index + 1}`, text: s.segment, start: s.index, end: s.index + s.segment.length }));
}
export interface MappedCorrection { correction: Correction; start: number; end: number }
const wordChar = /[\p{L}\p{N}_'’]/u;
export function mapCorrections(text: string, corrections: Correction[]) {
  const sentences = splitSentences(text);
  const mapped: MappedCorrection[] = [];
  const unmapped: Correction[] = [];
  for (const correction of corrections) {
    const sentence = sentences.find(s => s.id === correction.sentenceId);
    let localStart = -1;
    if (sentence) {
      let cursor = 0;
      let occurrence = 0;
      while (cursor <= sentence.text.length) {
        const index = sentence.text.indexOf(correction.originalText, cursor);
        if (index < 0) break;
        const end = index + correction.originalText.length;
        const leftOk = !wordChar.test(correction.originalText[0]) || index === 0 || !wordChar.test(sentence.text[index - 1]);
        const rightOk = !wordChar.test(correction.originalText.at(-1)!) || end === sentence.text.length || !wordChar.test(sentence.text[end]);
        if (leftOk && rightOk && ++occurrence === correction.occurrence) { localStart = index; break; }
        cursor = end;
      }
    }
    const start = (sentence?.start ?? 0) + localStart;
    const end = start + correction.originalText.length;
    if (localStart < 0 || mapped.some(m => start < m.end && end > m.start)) unmapped.push(correction);
    else mapped.push({ correction, start, end });
  }
  return { mapped: mapped.sort((a, b) => a.start - b.start), unmapped };
}
export function parseAnalysis(raw: string, originalTranscript: string): EnglishAnalysisResult {
  const clean = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = analysisSchema.parse(JSON.parse(clean));
  if (parsed.originalTranscript !== originalTranscript) throw new Error('The original transcript was changed.');
  if (new Set(parsed.corrections.map(c => c.id)).size !== parsed.corrections.length) throw new Error('Duplicate correction identifiers.');
  const { mapped, unmapped } = mapCorrections(originalTranscript, parsed.corrections);
  let correctedTranscript = originalTranscript;
  for (const mark of [...mapped].reverse()) correctedTranscript = correctedTranscript.slice(0, mark.start) + mark.correction.replacementText + correctedTranscript.slice(mark.end);
  const normalizeSpace = (text: string) => text.replace(/\s+/g, ' ').trim();
  if (!unmapped.length && normalizeSpace(parsed.correctedTranscript) !== normalizeSpace(correctedTranscript)) throw new Error('The clean transcript contains unexplained edits.');
  correctedTranscript = correctedTranscript.replace(/[ \t]{2,}/g, ' ').trim();
  const round = (value: number) => Math.round(value * 10) / 10;
  const scores = { grammar: round(parsed.scores.grammar), vocabulary: round(parsed.scores.vocabulary), clarity: round(parsed.scores.clarity), overall: round(parsed.scores.overall) };
  return { ...parsed, correctedTranscript, scores, remark: remarkFor(scores.overall) };
}

// Count a fix only when the exact taught replacement appears in the retry,
// and the original error phrase is absent. Mere omission is not improvement.
export function countDemonstratedFixes(previous: EnglishAnalysisResult, current: EnglishAnalysisResult) {
  const text = current.originalTranscript.toLocaleLowerCase();
  const occurrences = (phrase: string) => {
    const escaped = phrase.toLocaleLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_'’])${escaped}(?![\\p{L}\\p{N}_'’])`, 'gu'))].map(match => ({ start: match.index!, end: match.index! + match[0].length }));
  };
  const consumed: { start: number; end: number }[] = [];
  let count = 0;
  for (const correction of previous.corrections) {
    if (correction.correctionType !== 'error' || !correction.replacementText || current.corrections.some(n => n.originalText.toLowerCase() === correction.replacementText.toLowerCase())) continue;
    const replacements = occurrences(correction.replacementText);
    if (occurrences(correction.originalText).some(old => !replacements.some(replacement => old.start >= replacement.start && old.end <= replacement.end))) continue;
    const replacement = replacements.find(candidate => !consumed.some(used => candidate.start < used.end && candidate.end > used.start));
    if (replacement) { consumed.push(replacement); count++; }
  }
  return count;
}
