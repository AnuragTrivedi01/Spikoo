# Acceptance record

## Verified

- TypeScript compilation and production Vite build.
- 73 automated tests: original transcript preservation, whole-word/phrase/sentence alignment, contractions, overlap fallback, schema failures, strict score bounds, clean-version consistency, supplied correction examples, no invented errors in the correct fixture, conservative attempt comparisons, topic level/repetition, local dates, DST/leap dates, yesterday grace and gaps, PCM WAV headers/sample encoding, stereo mixing/clipping, MediaRecorder MIME preference, accurate-model/English/File request shape, character-for-character STT return, empty STT rejection, request timeout and late-result handling. Feedback service regressions additionally cover the reproduced empty/token-limited response, valid-looking but incomplete output, strict schema/transcript preservation, refusals, allowance errors without automatic retries, and metadata-only logging.
- Live feedback failure reproduced on September 12 with a synthetic five-sentence paragraph: `gpt-5-nano` returned empty content, `finish_reason: length`, and 6,500 completion tokens. The original service raised a JSON parsing error and showed the reported generic message. Switching only feedback generation to Puter's `openai/gpt-4.1-mini` with a 12,000 output-token limit returned seven corrections, scores, teacher feedback, strengths, and focus-next advice. The unchanged strict parser accepted the result and preserved the original transcript. No learner history was created by this diagnostic. This verifies the reproduced failure; it is not a guarantee against future provider outages or malformed AI output.
- Live Puter regression in Chrome on September 12: a browser-recorded synthetic voice sample failed as WebM/Opus with `upstream_bad_request` and "Audio file might be corrupted or unsupported". The same sample passed after in-memory WAV conversion through the actual transcription and English-analysis services, producing a transcript, three past-tense corrections, scores, and schema-validated feedback. No diagnostic attempt was saved to learner history.
- Live transcription checks after the accuracy update used the installed Microsoft Heera and Ravi `en-IN` voices at normal speed with a natural sentence pause. Both returned exactly: “Yesterday I went to the market and bought some vegetables. After a short pause, I continued speaking at my normal speed.” Tests used `gpt-4o-transcribe`, `language: 'en'`, the same browser MediaRecorder → WAV → Puter path as Spikoo, and created no learner records.
- Live dedicated Supabase database: six user-owned tables, RLS policies, stats view, profile trigger, atomic save RPC.
- Live SQL test with two temporary account identities and actual `authenticated`/`anon` roles: own-only profiles/preferences/stats, cross-user ledger denial, foreign session/attempt denial, anonymous denial, direct ledger write denial, exact retry idempotency, changed-payload rejection, same-topic attempt numbering, distinct session vs attempt totals, speaking time, streak start, rollback on malformed correction.
- The two test identities and all their practice data were rolled back; no fake history or marketing metrics were seeded.
- Public Supabase HTTP checks deny anonymous access to all six tables, the stats view, and the save RPC. Email signup and email confirmation are enabled.
- Browser checks at 1440px and 390px: landing assets loaded, no horizontal page overflow, mobile navigation opens, light/dark mode switches, and the teacher-version control shows the corrected text. The supplied logo and icon pass a byte-for-byte SHA-256 comparison with the originals.

## Remaining live acceptance

The owner has since signed in, completed enough onboarding to reach practice, and recorded an attempt. The reported transcription failure is fixed and verified with a live synthetic sample. Complete the following real-user checks after the fix:

1. Sign up using a Supabase organization-team email for the private test; follow the confirmation link and sign in in the same browser.
2. Complete onboarding and verify the selected level/name survive refresh.
3. Change a topic, start microphone recording, speak for 10–30 seconds, stop. Confirm the microphone indicator turns off.
4. Play, pause, seek, and record again. Nothing should be sent to Puter until Analyze.
5. Choose Analyze, connect Puter, and confirm transcription → validated feedback → real Supabase save.
6. Tap correction marks and inspect simple explanations, teacher version, scores, strengths and focus next. Confirm correctly spoken sentences are not unnecessarily rewritten.
7. Retry the same topic and check comparison, history attempts, actual activity/streak, and progress averages. Refresh and confirm saved text remains; audio should not.
8. Deny microphone permission once; test no microphone, very short recording, network loss, Puter popup cancellation/quota errors, malformed output, and save failure/retry using appropriate controlled test environments.
9. Before public launch, configure a verified **free** SMTP service in Supabase, update the production URL allowlist, and repeat the complete flow under HTTPS and the production CSP. No paid service should be enabled to resolve a failed check.

The fixture tests verify code behavior and database isolation; they are not evidence that a live AI model will always make accurate language judgments. Actual speech/model behavior must be evaluated using the requested four examples during final acceptance.

