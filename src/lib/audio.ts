const TRANSCRIPTION_SAMPLE_RATE = 32000;

// Plain PCM WAV avoids provider failures on MediaRecorder's WebM/Opus containers.
// The source recording is untouched, and both versions stay in memory only.
export function encodeMonoWav(channels: readonly Float32Array[], sampleRate: number): Blob {
  const frames = channels[0]?.length ?? 0;
  if (!frames || channels.some(channel => channel.length !== frames)) throw new Error('invalid_audio');
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || sampleRate > 192000) throw new Error('invalid_audio');
  const bytes = new ArrayBuffer(44 + frames * 2);
  const view = new DataView(bytes);
  const label = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  label(0, 'RIFF'); view.setUint32(4, 36 + frames * 2, true); label(8, 'WAVE');
  label(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
  view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  label(36, 'data'); view.setUint32(40, frames * 2, true);
  for (let frame = 0; frame < frames; frame++) {
    let sample = 0;
    for (const channel of channels) sample += channel[frame] / channels.length;
    sample = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0;
    view.setInt16(44 + frame * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}

export async function prepareTranscriptionAudio(recording: Blob): Promise<Blob> {
  if (!recording.size) throw new Error('invalid_audio');
  if (typeof OfflineAudioContext === 'undefined') throw new Error('audio_conversion_unavailable');
  // decodeAudioData resamples to the context's sample rate, without speaker or mic access.
  const context = new OfflineAudioContext(1, 1, TRANSCRIPTION_SAMPLE_RATE);
  const decoded = await context.decodeAudioData(await recording.arrayBuffer());
  if (!decoded.length || decoded.duration > 305) throw new Error('invalid_audio');
  const channels = Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i));
  return encodeMonoWav(channels, decoded.sampleRate);
}
