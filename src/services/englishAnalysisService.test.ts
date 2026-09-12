import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ chat: vi.fn() }));
vi.mock('./puterService', async importOriginal => ({
  ...await importOriginal<typeof import('./puterService')>(),
  loadPuter: async () => ({ ai: { chat: mocks.chat } }),
}));
import { analyzeEnglish, FEEDBACK_MODEL } from './englishAnalysisService';
import type { Topic } from '../types';

const topic: Topic = { id: 'test', text: 'Tell me about yesterday.', level: 'intermediate', category: 'Daily life', prompts: [] };
const transcript = '  Yesterday I go to the market.  ';
const feedback = {
  originalTranscript: transcript, correctedTranscript: 'Yesterday I went to the market.',
  corrections: [{ id: 'c1', sentenceId: 'sentence_1', originalText: 'go', occurrence: 1, replacementText: 'went', simpleExplanation: 'Use went for the past.', category: 'grammar', severity: 'important', correctionType: 'error' }],
  scores: { grammar: 7, vocabulary: 8, clarity: 8, overall: 7.5 }, remark: 'Very Good',
  teacherFeedback: 'Your story is clear. Practice past tense.', strengths: ['You give a place and time.'], focusNext: 'Use went when describing yesterday.',
};

describe('feedback generation', () => {
  beforeEach(() => {
    mocks.chat.mockReset();
    vi.stubGlobal('navigator', { onLine: true });
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('returns validated feedback while preserving the recognized transcript exactly', async () => {
    mocks.chat.mockResolvedValue({ finish_reason: 'stop', message: { content: JSON.stringify(feedback) } });
    const result = await analyzeEnglish(transcript, topic);
    expect(result.originalTranscript).toBe(transcript);
    expect(result.correctedTranscript).toBe('Yesterday I went to the market.');
    expect(result.corrections).toHaveLength(1);
    expect(mocks.chat).toHaveBeenCalledTimes(1);
    const [messages, options] = mocks.chat.mock.calls[0];
    expect(JSON.parse(messages[1].content).originalTranscript).toBe(transcript);
    expect(FEEDBACK_MODEL).toBe('openai/gpt-4.1-mini');
    expect(options).toMatchObject({ model: FEEDBACK_MODEL, normalize: true, max_tokens: 12000 });
    expect(options).not.toHaveProperty('reasoning_effort');
  });
  it('handles the reproduced empty response that exhausted all 6500 tokens', async () => {
    mocks.chat.mockResolvedValue({ finish_reason: 'length', message: { content: '' }, usage: { completion_tokens: 6500 } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('cut short');
    expect(mocks.chat).toHaveBeenCalledTimes(1);
  });
  it('does not accept even valid-looking JSON marked as incomplete', async () => {
    mocks.chat.mockResolvedValue({ finish_reason: 'length', message: { content: JSON.stringify(feedback) } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('cut short');
  });
  it('reports an empty response without inventing feedback or automatically retrying', async () => {
    mocks.chat.mockResolvedValue({ finish_reason: 'stop', message: { content: '   ' } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('no feedback text');
    expect(mocks.chat).toHaveBeenCalledTimes(1);
  });
  it('continues rejecting invalid feedback and logs only safe metadata', async () => {
    mocks.chat.mockResolvedValue({ finish_reason: 'stop', message: { content: '{broken private text' } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('not in a usable format');
    const logged = JSON.stringify([vi.mocked(console.debug).mock.calls, vi.mocked(console.warn).mock.calls]);
    expect(logged).not.toContain(transcript);
    expect(logged).not.toContain('broken private text');
  });
  it('does not accept a rewritten original transcript', async () => {
    mocks.chat.mockResolvedValue({ message: { content: JSON.stringify({ ...feedback, originalTranscript: transcript.trim() }) } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('not in a usable format');
  });
  it('reports refusals without trying to parse or retry them', async () => {
    mocks.chat.mockResolvedValue({ finish_reason: 'content_filter', message: { content: '' } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('could not provide feedback');
    expect(mocks.chat).toHaveBeenCalledTimes(1);
  });
  it('preserves quota errors and does not silently retry against another model', async () => {
    mocks.chat.mockRejectedValue({ error: { code: 'insufficient_funds' } });
    await expect(analyzeEnglish(transcript, topic)).rejects.toThrow('allowance');
    expect(mocks.chat).toHaveBeenCalledTimes(1);
  });
});
