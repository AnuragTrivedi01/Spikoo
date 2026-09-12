import { useCallback, useEffect, useRef, useState } from 'react';
export type RecordingState = 'idle' | 'requesting' | 'recording' | 'recorded';
export const MAX_SECONDS = 300;
export const RECORDER_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/ogg;codecs=opus',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/webm',
] as const;
export function selectRecorderMimeType(isSupported: (mimeType: string) => boolean) {
  return RECORDER_MIME_TYPES.find(isSupported);
}
export function useRecorder() {
  const [state, setState] = useState<RecordingState>('idle'); const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null); const [url, setUrl] = useState('');
  const [completedAt, setCompletedAt] = useState(''); const stoppedAt = useRef('');
  const [error, setError] = useState(''); const [levels, setLevels] = useState<number[]>(Array(24).fill(3));
  const recorder = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null); const objectUrl = useRef('');
  const mounted = useRef(true); const epoch = useRef(0); const raf = useRef(0); const timer = useRef(0); const started = useRef(0); const stopRequested = useRef(0);
  const releaseMic = useCallback(() => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; if (audioContext.current) { void audioContext.current.close().catch(() => undefined); audioContext.current = null; } cancelAnimationFrame(raf.current); clearInterval(timer.current); }, []);
  const reset = useCallback(() => {
    epoch.current++;
    if (recorder.current && recorder.current.state !== 'inactive') { recorder.current.ondataavailable = null; recorder.current.onstop = null; recorder.current.stop(); }
    recorder.current = null; stoppedAt.current = ''; stopRequested.current = 0; releaseMic();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = '';
    if (mounted.current) { setBlob(null); setUrl(''); setCompletedAt(''); setState('idle'); setDuration(0); setError(''); setLevels(Array(24).fill(3)); }
  }, [releaseMic]);
  const stop = useCallback(() => {
    if (recorder.current?.state !== 'recording') return;
    stoppedAt.current = new Date().toISOString(); stopRequested.current = performance.now();
    // MediaRecorder emits its final dataavailable event before onstop. Keep the
    // microphone alive until onstop so the final spoken words are not truncated.
    recorder.current.stop();
  }, []);
  const start = useCallback(async () => {
    reset(); setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { setError('Microphone recording needs a secure connection and a supported browser. Try a recent version of Chrome, Edge, Firefox, or Safari.'); return; }
    const request = ++epoch.current; setState('requesting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { ideal: 1 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
      }, video: false });
      if (!mounted.current || epoch.current !== request) { media.getTracks().forEach(t => t.stop()); return; }
      stream.current = media;
      const mimeType = selectRecorderMimeType(type => MediaRecorder.isTypeSupported(type));
      const rec = new MediaRecorder(media, mimeType ? { mimeType, audioBitsPerSecond: 128000 } : { audioBitsPerSecond: 128000 }); recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
      rec.onerror = () => { if (epoch.current !== request) return; reset(); setError('Recording stopped unexpectedly. Please check your microphone and try again.'); };
      rec.onstop = () => {
        const elapsedMs = Math.min(MAX_SECONDS * 1000, (stopRequested.current || performance.now()) - started.current);
        releaseMic();
        if (!mounted.current || epoch.current !== request) return;
        const seconds = Math.min(MAX_SECONDS, Math.floor(elapsedMs / 1000));
        const audio = new Blob(chunks, { type: rec.mimeType || chunks[0]?.type || 'audio/webm' });
        if (import.meta.env.DEV) console.debug('[Spikoo recorder]', { durationSeconds: Number((elapsedMs / 1000).toFixed(2)), blobBytes: audio.size, mimeType: audio.type });
        if (elapsedMs < 3000 || audio.size < 2000) { setError('That was a little short. Speak for at least 3 seconds, then try again.'); setState('idle'); setDuration(0); return; }
        objectUrl.current = URL.createObjectURL(audio); setBlob(audio); setUrl(objectUrl.current); setCompletedAt(stoppedAt.current || new Date().toISOString()); setDuration(seconds); setState('recorded');
      };
      media.getAudioTracks().forEach(track => { track.onended = () => { if (rec.state === 'recording') stop(); }; });
      started.current = performance.now(); stopRequested.current = 0; rec.start(); setState('recording');
      timer.current = window.setInterval(() => { const elapsed = Math.floor((performance.now() - started.current) / 1000); setDuration(Math.min(elapsed, MAX_SECONDS)); if (elapsed >= MAX_SECONDS) stop(); }, 200);
      try {
        const context = new AudioContext(); audioContext.current = context; void context.resume().catch(() => undefined);
        const analyser = context.createAnalyser(); analyser.fftSize = 128; context.createMediaStreamSource(media).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount); let lastPaint = 0;
        const animate = (now: number) => { if (rec.state !== 'recording' || epoch.current !== request) return; if (now - lastPaint > 75) { analyser.getByteFrequencyData(data); setLevels(Array.from({ length: 24 }, (_, i) => 3 + data[i * 2] / 255 * 36)); lastPaint = now; } raf.current = requestAnimationFrame(animate); };
        raf.current = requestAnimationFrame(animate);
      } catch { /* Recording works even if optional voice visualization is unavailable. */ }
    } catch (e) {
      releaseMic(); if (!mounted.current || epoch.current !== request) return; setState('idle');
      const name = e instanceof DOMException ? e.name : '';
      setError(name === 'NotAllowedError' ? 'Microphone access was not allowed. Enable it in your browser’s site settings, then try again.' : name === 'NotFoundError' ? 'No microphone was found. Connect a microphone, then try again.' : name === 'NotReadableError' ? 'Your microphone is busy or unavailable. Close other recording apps and try again.' : 'We could not start recording. Check your microphone and try again.');
    }
  }, [releaseMic, reset, stop]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; reset(); }; }, [reset]);
  return { state, duration, blob, url, completedAt, error, levels, start, stop, reset };
}
