import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prepareAudio: vi.fn(),
  speech2txt: vi.fn(),
}));
vi.mock('../lib/audio', () => ({ prepareTranscriptionAudio: mocks.prepareAudio }));
vi.mock('./puterService', () => ({
  loadPuter: vi.fn(async () => ({ ai: { speech2txt: mocks.speech2txt } })),
  withPuterTimeout: (request: Promise<unknown>) => request,
  puterError: (_error: unknown, fallback: string) => fallback,
}));

import { TRANSCRIPTION_MODEL, transcribeRecording } from './transcriptionService';

describe('Puter transcription request', () => {
  beforeEach(() => { mocks.prepareAudio.mockReset(); mocks.speech2txt.mockReset(); vi.spyOn(console, 'debug').mockImplementation(() => undefined); });
  it('sends a named high-quality WAV with English and the accurate model', async () => {
    const wav = new Blob(['wav-data'], { type: 'audio/wav' });
    mocks.prepareAudio.mockResolvedValue(wav);
    mocks.speech2txt.mockResolvedValue({ text: 'Yesterday I went to the market.' });
    await expect(transcribeRecording(new Blob(['recording']))).resolves.toBe('Yesterday I went to the market.');
    const [file, options] = mocks.speech2txt.mock.calls[0];
    expect(file).toBeInstanceOf(File); expect(file.name).toBe('spikoo-recording.wav'); expect(file.type).toBe('audio/wav');
    expect(options).toMatchObject({ provider: 'openai', model: 'gpt-4o-transcribe', language: 'en', response_format: 'json' });
    expect(TRANSCRIPTION_MODEL).toBe('gpt-4o-transcribe');
  });
  it('returns Puter’s recognized text character-for-character', async () => {
    mocks.prepareAudio.mockResolvedValue(new Blob(['wav-data'], { type: 'audio/wav' }));
    mocks.speech2txt.mockResolvedValue({ text: '  I did a mistake.  ' });
    await expect(transcribeRecording(new Blob(['recording']))).resolves.toBe('  I did a mistake.  ');
  });
  it('rejects empty recognition rather than inventing a transcript', async () => {
    mocks.prepareAudio.mockResolvedValue(new Blob(['wav-data'], { type: 'audio/wav' }));
    mocks.speech2txt.mockResolvedValue({ text: '  ' });
    await expect(transcribeRecording(new Blob(['recording']))).rejects.toThrow('could not hear enough speech');
  });
});
