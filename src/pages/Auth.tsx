import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { SpikooLogo, ThemeToggle } from '../components/Brand';
import { useAuth } from '../context/AuthContext';
import { isConfigured, database } from '../services/supabaseClient';
export default function Auth({ mode }: { mode: 'signin' | 'signup' }) {
  const { user, loading } = useAuth(); const signup = mode === 'signup';
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [sent, setSent] = useState(false);
  if (user && !loading) return <Navigate to="/practice" replace />;
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !isConfigured) return; setBusy(true); setError('');
    try {
      const db = database();
      const result = signup ? await db.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/practice` } }) : await db.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) {
        const code = result.error.code;
        if (code === 'email_not_confirmed') throw new Error('Please confirm your email using the link in your inbox, then sign in.');
        if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') throw new Error('Too many attempts. Please wait a few minutes before trying again.');
        if (code === 'email_address_not_authorized') throw new Error('Email signup is not available yet. Please contact the Spikoo owner.');
        if (code === 'weak_password') throw new Error('Please choose a stronger password with at least 8 characters, including letters and numbers.');
        throw new Error(signup ? 'Your account could not be created. Try signing in if you already have an account, or try again later.' : 'We could not sign you in. Check your email and password, then try again.');
      }
      if (signup && !result.data.session) setSent(true);
    } catch (e) { setError(!navigator.onLine ? 'You are offline. Reconnect and try again.' : e instanceof Error ? e.message : 'Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><header className={`simple-header ${signup ? '' : 'signin-simple-header'}`}>{signup && <SpikooLogo />}<ThemeToggle /></header><main id="main-content" className="auth-layout"><section className="auth-art"><div className="eyebrow"><Sparkles size={16} /> Your next chapter starts here</div><h1>A little practice.<br /><span className="gradient-text">A more confident you.</span></h1><img src="/assets/learning-scene.png" alt="Your friendly English practice space" width="1254" height="1254" /><p>Speak. Learn. Grow. At your own pace.</p></section><section className="auth-form-wrap">{!signup && <div className="auth-brand"><SpikooLogo /></div>}<Link to="/" className="back-link"><ArrowLeft size={16} /> Back to home</Link>{sent ? <div className="email-sent"><CheckCircle2 size={44} /><h2>Check your inbox</h2><p>If this email can be used to sign up, you’ll receive a confirmation link at <strong>{email}</strong>. Follow the link to start your practice.</p><Link to="/signin" className="button button-primary">Back to sign in <ArrowRight size={18} /></Link></div> : <><span className="kicker">{signup ? 'LET’S FIND YOUR VOICE' : 'YOUR NEXT SMALL STEP'}</span><h2>{signup ? 'Welcome to Spikoo.' : 'Good to see you again.'}</h2><p className="auth-subtitle">{signup ? 'Create your account and make room for a little progress.' : 'Your English journey is right where you left it.'}</p>{!isConfigured && <div className="notice" role="status">Spikoo’s account service is being connected. Please check back soon.</div>}<form onSubmit={submit}>{signup && <label>Your name<input value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={60} required placeholder="What should we call you?" /></label>}<label>Email address<div className="input-icon"><Mail size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required placeholder="you@example.com" maxLength={254} /></div></label><label>Password<div className="input-icon"><LockKeyhole size={18} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : 1} maxLength={128} required placeholder={signup ? 'At least 8 characters' : 'Your password'} /><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{error && <div className="notice" role="alert">{error}</div>}<button disabled={busy || !isConfigured} className="button button-primary full-width" type="submit">{busy ? 'One moment…' : signup ? 'Create my account' : 'Sign in'}{!busy && <ArrowRight size={18} />}</button></form><p className="auth-switch">{signup ? 'Already have an account?' : 'New to Spikoo?'} <Link to={signup ? '/signin' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link></p><p className="auth-privacy"><LockKeyhole size={13} /> Your account saves your learning journey.<br /><Link to="/privacy">Learn how Spikoo handles your data</Link></p></>}</section></main></div>;
}

