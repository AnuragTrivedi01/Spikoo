import { describe, expect, it } from 'vitest';
import { RECORDER_MIME_TYPES, selectRecorderMimeType } from './useRecorder';

describe('MediaRecorder format selection', () => {
  it('prefers Opus WebM when the browser supports it', () => {
    expect(selectRecorderMimeType(type => ['audio/mp4', 'audio/webm;codecs=opus'].includes(type))).toBe('audio/webm;codecs=opus');
  });
  it('falls back through the explicit quality/compatibility order', () => {
    expect(selectRecorderMimeType(type => type === 'audio/mp4')).toBe('audio/mp4');
    expect(selectRecorderMimeType(() => false)).toBeUndefined();
    expect(RECORDER_MIME_TYPES).toHaveLength(5);
  });
});
