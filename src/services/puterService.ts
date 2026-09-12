interface PuterSDK {
  auth: { isSignedIn(): boolean; signIn(): Promise<unknown> };
  ai: { speech2txt(source: Blob, options: Record<string, unknown>): Promise<unknown>; chat(messages: { role: string; content: string }[], options: Record<string, unknown>): Promise<unknown> };
}
declare global { interface Window { puter?: PuterSDK } }
let sdkPromise: Promise<PuterSDK> | null = null;
export function loadPuter(): Promise<PuterSDK> {
  if (window.puter) return Promise.resolve(window.puter);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://js.puter.com/v2/'; script.async = true;
    const timeout = window.setTimeout(() => { script.remove(); sdkPromise = null; reject(new Error('AI access could not load. Check your connection and try again.')); }, 20000);
    script.onload = () => { clearTimeout(timeout); if (window.puter) resolve(window.puter); else { sdkPromise = null; reject(new Error('AI access could not load. Please try again.')); } };
    script.onerror = () => { clearTimeout(timeout); script.remove(); sdkPromise = null; reject(new Error('AI access could not load. Check your connection and try again.')); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
// Called directly from the Continue with Puter button, with the SDK preloaded.
export function authorizePuter() {
  if (!window.puter) return Promise.reject(new Error('AI access is still loading. Please try again in a moment.'));
  return window.puter.auth.isSignedIn() ? Promise.resolve() : window.puter.auth.signIn().then(() => undefined);
}
export function withPuterTimeout<T>(request: Promise<T>, timeoutMs = 120000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('puter_request_timeout')), timeoutMs);
    request.then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
  });
}
export function puterError(error: unknown, fallback: string) {
  let detail = '';
  try { detail = JSON.stringify(error) + (error instanceof Error ? error.message : ''); } catch { /* no raw errors in UI */ }
  if (/puter_request_timeout/i.test(detail)) return 'AI feedback is taking too long. Your recording and any transcript are still here. Please try again in a moment.';
  if (/audio.*(?:corrupted|unsupported)|unsupported.*audio/i.test(detail)) return 'The transcription service could not read this recording. Your audio is still here. Please try again, or record a new attempt.';
  if (/upstream.*(?:unavailable|internal)|service_unavailable|\b50[234]\b/i.test(detail)) return 'The AI service is temporarily unavailable. Your recording is still here; please try again shortly.';
  if (/insufficient_funds|subscription_required|allowance|quota|402|not enough credits/i.test(detail)) return 'Your current AI allowance is unavailable. Please check your Puter account and try again later.';
  if (/too_many_requests|429|rate.limit/i.test(detail)) return 'AI feedback is busy right now. Please wait a moment, then try again.';
  if (/popup_blocked/i.test(detail)) return 'Please allow the Puter sign-in popup, then choose Continue with Puter again.';
  if (/auth_window_closed|auth.*cancel/i.test(detail)) return 'AI access was not enabled. Your recording is still here when you are ready.';
  if (/auth|unauthorized|401/i.test(detail)) return 'Please reconnect your Puter account to use AI feedback.';
  if (!navigator.onLine) return 'You are offline. Reconnect and try again; keep this page open to retain your recording.';
  return fallback;
}
export function extractChatText(result: unknown): string {
  if (typeof result === 'string') return result;
  const content = (result as { message?: { content?: unknown } })?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(b => typeof b?.text === 'string' ? b.text : '').join('');
  throw new Error('No feedback text returned.');
}
