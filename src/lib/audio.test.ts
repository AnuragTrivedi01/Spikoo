import { describe, expect, it } from 'vitest';
import { encodeMonoWav } from './audio';

describe('transcription WAV encoding', () => {
  it('writes a valid mono PCM16 RIFF header and exact sample bytes', async () => {
    const source = new Float32Array([-1, 0, 1]);
    const blob = encodeMonoWav([source], 32000);
    const buffer = await blob.arrayBuffer(); const view = new DataView(buffer);
    expect(blob.type).toBe('audio/wav'); expect(buffer.byteLength).toBe(50);
    expect(new TextDecoder().decode(buffer.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(buffer.slice(8, 12))).toBe('WAVE');
    expect(view.getUint32(4, true)).toBe(42);
    expect(view.getUint16(20, true)).toBe(1); expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(32000); expect(view.getUint32(28, true)).toBe(64000);
    expect(view.getUint16(32, true)).toBe(2); expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(6);
    expect([44, 46, 48].map(offset => view.getInt16(offset, true))).toEqual([-32768, 0, 32767]);
    expect(Array.from(source)).toEqual([-1, 0, 1]);
  });
  it('mixes stereo into mono and clamps out-of-range or invalid samples', async () => {
    const blob = encodeMonoWav([new Float32Array([1, -3, 2, NaN]), new Float32Array([-1, -1, 2, 0])], 16000);
    const view = new DataView(await blob.arrayBuffer());
    expect([44, 46, 48, 50].map(offset => view.getInt16(offset, true))).toEqual([0, -32768, 32767, 0]);
  });
  it('rejects empty recordings, inconsistent channels, and invalid sample rates', () => {
    expect(() => encodeMonoWav([], 16000)).toThrow('invalid_audio');
    expect(() => encodeMonoWav([new Float32Array(0)], 16000)).toThrow('invalid_audio');
    expect(() => encodeMonoWav([new Float32Array(2), new Float32Array(1)], 16000)).toThrow('invalid_audio');
    expect(() => encodeMonoWav([new Float32Array(1)], 0)).toThrow('invalid_audio');
  });
});
