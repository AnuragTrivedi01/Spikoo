# Deploy Spikoo to Vercel

Use only the personal GitHub account **AnuragTrivedi01** and the owner's personal Vercel account. Keep the source repository private.

## Import the repository

1. In Vercel, select **Add New → Project**.
2. Import the Spikoo repository from **AnuragTrivedi01**. If Vercel needs GitHub access, authorize only that repository.
3. Keep **Framework Preset: Vite** and **Root Directory: ./**. The committed `vercel.json` sets `npm ci`, `npm run build`, `dist`, SPA routing, and response headers. Use Node.js 22 or newer.
4. Add the following Environment Variables for Production and Preview, using the values in the local `.env.local`:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

   These are frontend-safe values. Never add a Supabase service-role key, database password, or AI provider secret. Puter needs no owner API key.
5. Click **Deploy** and copy the stable production domain from the project's Domains section.

## Connect production authentication

In the dedicated Spikoo Supabase project `ugozcykcjnehqbjyouqa`, open **Authentication → URL Configuration**:

- Site URL: `https://YOUR-PRODUCTION-DOMAIN`
- Add Redirect URL: `https://YOUR-PRODUCTION-DOMAIN/practice`
- Keep `http://127.0.0.1:5173/practice` for local development.

Use the stable production domain, not an individual deployment's temporary URL. If testing authentication on a preview, separately allow its exact `/practice` return URL. Do not allow every Vercel customer's domain with a broad wildcard.

## Verify the hosted application

Open `/`, `/signup`, `/practice`, `/history`, and `/privacy` directly and refresh each. Confirm that protected routes lead to sign-in, not a hosting 404. Complete signup and email confirmation, sign in, record and play audio, authorize Puter, analyze, and check saved History and Progress. The deployed HTTPS origin may request microphone permission and Puter authorization again.

If email confirmation is enabled, public signup needs custom SMTP in Supabase; the default mailer is restricted and has a project-wide email quota. Hosting alone does not fix email delivery.

Changes to Vercel environment variables require a new deployment. Future pushes to the connected production branch trigger deployments.

Vercel Hobby is for personal, non-commercial use. Do not enable paid plans or add-ons automatically; review plan suitability before commercial launch.

Official references:

- https://vercel.com/docs/frameworks/frontend/vite
- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/plans/hobby
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/auth/auth-smtp
