# Spikoo

**SPEAK. LEARN. GROW.** A browser-first English practice app built with React, TypeScript, Vite, Supabase Free, and Puter.js user-pays AI.

## Current status

The application and production static build are implemented. The dedicated Supabase project is connected and its schema is installed. The two-user database isolation and transactional-save test passed against that project, using two temporary account identities rolled back at the end. The 73 unit tests pass.

The owner has signed in and reached the recorded-audio practice screen. A live synthetic recording reproduced Puter's rejection of Chrome WebM/Opus audio. After adding in-memory PCM WAV conversion, the same sample passed real Puter transcription, English analysis, and strict response validation. This diagnostic creates no learner records. **A complete real-microphone attempt through saved history still needs rechecking after this fix; this is not a claim of completed production acceptance.** Public email delivery also needs the configuration below. No website or source repository has been published.

## Run locally

Use Node.js 22 or newer (the computer's system Node 18 is too old). The lockfile records the installed packages.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/`. The local `.env.local` is already populated with the frontend-safe connection details the owner supplied. To set up another dedicated instance, copy `.env.example` to `.env.local` and supply:

```dotenv
VITE_SUPABASE_URL=https://YOUR-DEDICATED-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never put a service-role key, secret key, database password, or AI provider key in a `VITE_` variable. Vite bundles these variables into the public frontend. Supabase's publishable key is intentionally public; RLS and the signed-in JWT protect the data.

On this computer a suitable bundled Node executable is available at:

`C:\Users\anurag.trivedi\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`

You can run `node_modules/vite/bin/vite.js`, `node_modules/typescript/bin/tsc -b`, and `node_modules/vitest/vitest.mjs run` with that executable without changing global configuration.

## Supabase setup

Only use the dedicated Spikoo project. The current project is `ugozcykcjnehqbjyouqa`; no unrelated project is needed.

1. For a **new empty database**, apply `supabase/migrations/001_spikoo.sql` once in its SQL Editor. This is already installed in the current project; do not rerun it there. Do not use destructive resets to apply changes. Future changes belong in a new migration.
2. Enable email/password signup in Authentication. Keep email confirmation enabled.
3. For local use, the Site URL is `http://127.0.0.1:5173` and the allowed redirect URL is `http://127.0.0.1:5173/practice`. Use the same browser for signup and the confirmation link. For a hosted build, add the exact HTTPS origin and `/practice` return URL.
4. Run `supabase/tests/rls_and_saving.sql` as postgres in the dedicated SQL Editor to verify isolation. The script uses temporary passwordless identities, exercises the actual authenticated/anonymous PostgreSQL roles, and rolls back all fixture data. Its temporary payload table is session-local and is not exposed through PostgREST.
5. `npm run check:backend` checks the public auth settings and confirms anonymous reads/writes are denied. It never logs the key or touches other projects.

### Email delivery is a launch dependency

Supabase's default SMTP service only delivers to organization-team email addresses and is limited to two messages per hour. Use the email associated with the owner's Supabase organization for the initial private test. **Public signup with confirmation needs custom SMTP configured in Supabase.** Select a provider with a genuinely free tier and suitable verified sender setup before public launch. No provider, paid plan, card, or email subscription has been added by this project. Do not disable confirmation silently or promise general signup works with the default mailer.

Official guidance: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [API keys](https://supabase.com/docs/guides/api/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Architecture and data lifecycle

```text
Browser microphone → temporary Blob → local play/pause/seek
   → explicit Analyze click → Puter user authorization
   → in-memory mono WAV conversion → Puter speech2txt → original transcript
   → Puter chat → validated teacher feedback
   → one transactional Supabase RPC → text, scores, corrections, activity
   → revoke local audio URL and release audio Blob
```

- Supabase is the only Spikoo account system. Puter access is separate and only enabled for AI feedback.
- Raw audio is never written to Supabase Storage, SQL, localStorage, IndexedDB, Puter filesystem, or Puter KV. Puter's and its providers' processing/retention policies apply to audio the learner chooses to send.
- Failed AI requests retain the recording/transcript in page memory for a retry. Successful AI plus failed database save keeps feedback visible with **Retry saving**. Refreshing/leaving can discard unsaved work; the app warns before doing so.
- A stable attempt UUID and payload fingerprint make database retry idempotent. A single SQL transaction writes session, attempt, corrections, and that day's activity. A per-user advisory lock prevents numbering/aggregation races across tabs.
- The ledger is immutable through the client API. Direct inserts/updates/deletes are denied. The narrow `SECURITY DEFINER` RPC derives ownership from `auth.uid()` and rechecks existing sessions/attempts. It never accepts a user ID as authority. Child composite foreign keys prevent cross-owner parent links. All user-owned tables have RLS; the stats view uses `security_invoker=true`.
- Practice days use the recording completion timestamp and the learner's saved time zone; only successfully analyzed and saved attempts count. Each session groups one topic’s attempts; daily session counts reflect distinct sessions practiced that day. Longest/current streaks and averages derive from real records. No UI visit or failed attempt creates activity.
- AI JSON is validated with Zod. Original text must match exactly. Sentence IDs, case-sensitive phrase matching, whole-word boundaries, and 1-based occurrences anchor corrections. Overlaps/uncertain mappings are shown separately. The clean version is constructed from mapped edits to prevent unexplained rewriting. Natural improvements are labeled separately.
- This browser-first design cannot cryptographically certify that learner-supplied scores came from AI: an authenticated learner can submit self-owned feedback to the RPC. Scores are private learning guidance, not credentials, assessments, or leaderboard data. No paid verification backend has been added.

## AI integration and owner cost

The SDK is loaded from `https://js.puter.com/v2/` only when the learner asks to enable AI. `signIn()` is called directly from the button event to preserve popup permission. The app calls:

- `puter.ai.speech2txt(wavFile, { provider: 'openai', model: 'gpt-4o-transcribe', language: 'en', response_format: 'json', prompt: 'Transcribe … exactly as spoken …' })`
- `puter.ai.chat(messages, { model: 'openai/gpt-4.1-mini', stream: false, max_tokens: 12000, temperature: 0.2, normalize: true })`

The `provider` selection occurs **inside Puter**; there is no direct OpenAI integration, owner API key, proxy, or funded wallet. Chat asks for JSON and validates it locally; it does not assume an unsupported chat `response_format` option. Puter allowance failures stop processing and ask the learner to check their own account. No automatic AI retries or upgrades are performed.

The earlier feedback model reproduced an empty `message.content` with `finish_reason: length` after consuming all 6,500 completion tokens on a five-sentence synthetic paragraph. JSON parsing then hid that provider failure behind a generic message. Feedback now uses Puter's non-reasoning GPT-4.1 mini model, reserves up to 12,000 tokens for output, and checks incomplete/empty/refused responses before parsing. The same paragraph passed live strict validation with seven mapped corrections. Original transcripts and strict notebook consistency checks are unchanged. Development logs include only model, finish status, lengths, and validation category; no raw feedback or credentials. Run `/scripts/feedback-check.html` locally to compare the old failure with the fixed service using synthetic text only; it is excluded from the production build.

The recorder requests echo cancellation, noise suppression, automatic gain control, mono audio, and a 48 kHz source rate where the device supports them. It prefers Opus at 128 kbps, falls back through explicit compatible MIME types, and waits for MediaRecorder's final `dataavailable` event before stopping microphone tracks. Recordings under three real seconds or 2 KB are rejected locally. Development-only logs contain duration, byte size, MIME type, and recognized text; no audio bytes are logged.

Recordings are decoded locally with `OfflineAudioContext` into 32 kHz mono PCM WAV before transcription; this fixes a reproduced `upstream_bad_request` / unsupported-audio response for browser-recorded WebM/Opus while retaining more speech detail and staying below Puter's 25 MB input limit for Spikoo's five-minute maximum. The WAV is sent as a named `File` to Puter's higher-accuracy `gpt-4o-transcribe` model with the English language hint. Spikoo validates Puter's result but returns its recognized text character-for-character, including any surrounding whitespace. The original playback Blob is preserved on failure. Each remote AI call has a two-minute UI timeout; the SDK does not expose cancellation, so a timed-out upstream request may still finish, but its late result is ignored.

For a local integration regression, run `powershell.exe -NoProfile -File scripts/create-ai-test-audio.ps1` and open `/scripts/ai-check.html` on the development server. It uses a synthetic voice fixture and the current Puter account's allowance, without creating Supabase practice records. These development files are excluded from the built `dist/` site.

Current official references checked September 2026: [speech2txt](https://docs.puter.com/AI/speech2txt/), [chat](https://docs.puter.com/AI/chat/), [signIn](https://docs.puter.com/Auth/signIn/), [user-pays](https://docs.puter.com/user-pays-model/), [quotas](https://docs.puter.com/rate-limits-and-quotas/).

Supabase Free provides a 500 MB database, 50,000 monthly active users, and 5 GB egress; inactive free projects may pause after a week. These are service limits, not promises of unlimited capacity. Stay on Free, monitor usage in the dedicated project, and do not enable billing upgrades. [Supabase pricing](https://supabase.com/pricing)

## Build and free static hosting

```sh
npm test
npm run build
npm run preview
```

`dist/` is a static SPA. It contains no server functions or database secrets. `public/_redirects` supports deep links; `public/_headers` supplies a CSP, microphone-only permissions policy, and other response headers for Cloudflare Pages. Preview locally first.

When publishing is explicitly requested, a no-Git option is Cloudflare Pages Free **Direct Upload** of the built `dist/` folder or its zip. Use the free `pages.dev` address; no custom domain, paid Workers, storage, or functions are needed. Do not connect any company Git account or publish source. After deployment, update Supabase's exact site/redirect URLs and test signup, microphone permission, Puter popup, and provider connectivity under the deployed CSP.

[Cloudflare Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/) · [Free plan limits](https://developers.cloudflare.com/pages/platform/limits/)

## Files and validation

- `src/pages/` — landing, auth, onboarding, practice, feedback, progress, history, profile, privacy.
- `src/components/` — unchanged logo assets, teacher notebook, score cards, audio controls, activity grid and chart.
- `src/services/` — centralized Supabase client, auth, transactional saves, progress queries, Puter, transcription and analysis.
- `src/hooks/useRecorder.ts` — microphone/MediaRecorder lifecycle, time limit, voice levels, release and cleanup.
- `src/lib/` — strict feedback validation, phrase mapping, conservative retry comparison, local-date logic.
- `supabase/` — schema and rollback-only two-user tests.
- `docs/ACCEPTANCE.md` — honest acceptance record and remaining live checks.

No Git repository was initialized; no Git credentials/remotes were accessed. Supplied logo/icon PNGs are copied unchanged. The standalone hero was generated with the built-in ImageGen tool; its prompt and origin are recorded in `docs/ASSETS.md`.

