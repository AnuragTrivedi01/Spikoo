import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, useLocation } from 'react-router-dom';
import { BarChart3, History, LockKeyhole, Mic, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SpikooLogo, ThemeToggle } from '../components/Brand';
const Practice = lazy(() => import('./Practice'));
const Progress = lazy(() => import('./Progress'));
const HistoryPage = lazy(() => import('./History'));
const ProfilePage = lazy(() => import('./Profile'));
const Onboarding = lazy(() => import('./Onboarding'));
export function AppLoading() { return <div className="loading-page" role="status"><img src="/assets/spikoo-icon.png" width={70} alt="" /><p>Getting your practice ready…</p></div>; }
export default function AppRoutes() {
  const { user, profile, preferences, loading, error, reload, signOut } = useAuth();
  const { setTheme } = useTheme(); const { pathname, search } = useLocation();
  useEffect(() => { if (preferences) setTheme(preferences.theme); }, [preferences, setTheme]);
  if (loading) return <AppLoading />;
  if (!user) return <Navigate to="/signin" replace />;
  if (error) return <div className="error-page"><SpikooLogo /><h1>Your account needs a moment.</h1><p>{error}</p><button className="button button-primary" onClick={() => void reload()}>Try again</button><button className="text-button" onClick={() => void signOut().catch(() => undefined)}>Sign out</button></div>;
  if (!profile || !preferences) return <AppLoading />;
  if (!profile.onboarding_completed && pathname !== '/onboarding') return <Navigate to="/onboarding" replace />;
  if (pathname === '/onboarding') return <Suspense fallback={<AppLoading />}><Onboarding /></Suspense>;
  const routes = [{ to: '/practice', icon: Mic, label: 'Practice' }, { to: '/progress', icon: BarChart3, label: 'Progress' }, { to: '/history', icon: History, label: 'History' }, { to: '/profile', icon: UserRound, label: 'Profile' }];
  return <div className="app-shell"><header className="app-header"><div className="app-header-inner"><SpikooLogo mobileIcon /><nav className="app-nav" aria-label="Learning navigation">{routes.map(({ to, icon: Icon, label }) => <NavLink key={to} to={to}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><div className="app-header-right"><ThemeToggle /><Link to="/profile" className="avatar" aria-label="Your profile">{profile.display_name.slice(0, 1).toUpperCase() || 'S'}</Link></div></div></header><main id="main-content" className="app-main"><Suspense fallback={<AppLoading />}>{pathname.startsWith('/practice') ? <Practice key={search} /> : pathname === '/progress' ? <Progress /> : pathname.startsWith('/history') ? <HistoryPage /> : <ProfilePage />}</Suspense></main><footer className="app-footer"><LockKeyhole size={12} /><span>Your space to speak, learn, and grow.</span><Link to="/privacy">Privacy</Link></footer></div>;
}


