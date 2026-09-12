import { prepareTranscriptionAudio } from '../lib/audio';
import { loadPuter, puterError, withPuterTimeout } from './puterService';
export const TRANSCRIPTION_MODEL = 'gpt-4o-transcribe';
export async function transcribeRecording(blob: Blob): Promise<string> {
  let audio: Blob;
  try { audio = await prepareTranscriptionAudio(blob); }
  catch { throw new Error('This recording could not be prepared for transcription. Your audio is still here. Try again, or record a new attempt if the audio does not play.'); }
  try {
    const puter = await loadPuter();
    const file = new File([audio], 'spikoo-recording.wav', { type: 'audio/wav' });
    const result = await withPuterTimeout(puter.ai.speech2txt(file, {
      provider: 'openai', model: TRANSCRIPTION_MODEL, language: 'en', response_format: 'json',
      prompt: 'Transcribe the English speech exactly as spoken. Preserve the speaker’s words and grammar; do not correct or rewrite them.',
    }));
    const text = typeof result === 'string' ? result : (result as { text?: unknown })?.text;
    if (typeof text !== 'string' || text.trim().length < 3) throw new Error('empty_transcript');
    if (text.length > 20000) throw new Error('long_transcript');
    if (import.meta.env.DEV) console.debug('[Spikoo transcription]', { model: TRANSCRIPTION_MODEL, language: 'en', characters: text.length, result: text });
    return text;
  } catch (error) {
    if (error instanceof Error && error.message === 'empty_transcript') throw new Error('We could not hear enough speech. Please record again and speak a little closer to your microphone.');
    if (error instanceof Error && error.message === 'long_transcript') throw new Error('This recording is too long to check. Please record a shorter attempt.');
    throw new Error(puterError(error, 'We could not write down your recording. Your audio is still here; please try again.'));
  }
}
