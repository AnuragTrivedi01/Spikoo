import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractChatText, puterError, withPuterTimeout } from './puterService';
describe('Puter response parsing', () => {
  it('reads text strings', () => expect(extractChatText({ message: { content: '{"ok":true}' } })).toBe('{"ok":true}'));
  it('reads text blocks', () => expect(extractChatText({ message: { content: [{ type: 'text', text: '{"ok":' }, { type: 'text', text: 'true}' }] } })).toBe('{"ok":true}'));
  it('rejects absent feedback rather than inventing results', () => expect(() => extractChatText({ message: {} })).toThrow());
});

describe('Puter request failures', () => {
  afterEach(() => vi.useRealTimers());
  it('ends a stalled request and ignores a late result', async () => {
    vi.useFakeTimers();
    let finish!: (value: string) => void;
    const request = new Promise<string>(resolve => { finish = resolve; });
    const result = withPuterTimeout(request, 1000);
    const rejection = expect(result).rejects.toThrow('puter_request_timeout');
    await vi.advanceTimersByTimeAsync(1000); await rejection;
    finish('late feedback');
    await expect(result).rejects.toThrow('puter_request_timeout');
  });
  it('clears the timeout after success or failure', async () => {
    vi.useFakeTimers();
    await expect(withPuterTimeout(Promise.resolve('ok'))).resolves.toBe('ok');
    await expect(withPuterTimeout(Promise.reject(new Error('failure')))).rejects.toThrow('failure');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('explains the actual upstream audio rejection without exposing raw errors', () => {
    expect(puterError({ error: { code: 'upstream_bad_request', message: 'Audio file might be corrupted or unsupported' } }, 'fallback')).toContain('could not read this recording');
    expect(puterError(new Error('puter_request_timeout'), 'fallback')).toContain('taking too long');
  });
});
