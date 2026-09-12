import { Component, Suspense, lazy, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Link, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './pages/Landing';
import './styles.css';
const Auth = lazy(() => import('./pages/Auth'));
const Privacy = lazy(() => import('./pages/Privacy'));
const AppRoutes = lazy(() => import('./pages/AppRoutes'));
function ScrollManager() { const { pathname } = useLocation(); useEffect(() => { window.scrollTo(0, 0); }, [pathname]); return null; }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Never send transcripts or errors to third-party analytics. */ }
  render() { return this.state.failed ? <main className="error-page"><img src="/assets/spikoo-icon.png" alt="Spikoo" width="90" /><h1>Let’s take a small pause.</h1><p>Spikoo could not display this page. Reload to try again. Unsaved recordings will be discarded.</p><button className="button button-primary" onClick={() => window.location.reload()}>Reload Spikoo</button></main> : this.props.children; }
}
export function Loading() { return <div className="loading-page" role="status"><img src="/assets/spikoo-icon.png" width="80" alt="" /><p>Getting your space ready…</p></div>; }
function RouterContent() { return <><a className="skip-link" href="#main-content">Skip to content</a><ScrollManager /><Suspense fallback={<Loading />}><Routes><Route path="/" element={<Landing />} /><Route path="/signup" element={<Auth key="signup" mode="signup" />} /><Route path="/signin" element={<Auth key="signin" mode="signin" />} /><Route path="/privacy" element={<Privacy />} /><Route path="/practice/*" element={<AppRoutes />} /><Route path="/progress" element={<AppRoutes />} /><Route path="/history/*" element={<AppRoutes />} /><Route path="/profile" element={<AppRoutes />} /><Route path="/onboarding" element={<AppRoutes />} /><Route path="*" element={<main className="error-page"><h1>This page took a different path.</h1><Link className="button button-primary" to="/">Back to Spikoo</Link></main>} /></Routes></Suspense></>; }
const router = createBrowserRouter([{ path: '*', element: <RouterContent /> }]);
createRoot(document.getElementById('root')!).render(<ErrorBoundary><ThemeProvider><AuthProvider><RouterProvider router={router} /></AuthProvider></ThemeProvider></ErrorBoundary>);

