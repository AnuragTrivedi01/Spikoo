import { readFile } from 'node:fs/promises';
const config = {};
for (const file of ['.env', '.env.local']) {
  try { for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) { const match = line.match(/^([A-Z_]+)=(.*)$/); if (match) config[match[1]] = match[2].trim(); } } catch { /* optional local config */ }
}
const url = process.env.VITE_SUPABASE_URL || config.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || config.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key?.startsWith('sb_publishable_')) throw new Error('Set the dedicated project URL and publishable key in .env.local. Never use an admin key.');
const headers = { apikey: key };
const settings = await fetch(`${url}/auth/v1/settings`, { headers, signal: AbortSignal.timeout(15000) });
if (!settings.ok) throw new Error(`Authentication settings unavailable (${settings.status}).`);
const auth = await settings.json();
console.log(`Email authentication: ${auth.external?.email ? 'enabled' : 'disabled'}. Email confirmation: ${auth.mailer_autoconfirm ? 'disabled' : 'enabled'}.`);
for (const table of ['profiles', 'user_preferences', 'practice_sessions', 'practice_attempts', 'corrections', 'daily_activity', 'user_stats']) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers, signal: AbortSignal.timeout(15000) });
  if (![401, 403].includes(response.status)) throw new Error(`Anonymous access check for ${table} returned ${response.status}; expected permission denial.`);
  console.log(`PASS: anonymous access to ${table} denied.`);
}
const rpc = await fetch(`${url}/rest/v1/rpc/save_practice_attempt`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_payload: {} }), signal: AbortSignal.timeout(15000) });
if (![401, 403].includes(rpc.status)) throw new Error(`Anonymous RPC check returned ${rpc.status}; expected permission denial.`);
console.log('PASS: anonymous save denied. This preflight does not replace the two-user SQL test or live learner flow.');
