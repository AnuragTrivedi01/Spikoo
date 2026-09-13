import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
export function SpikooLogo({ compact = false, mobileIcon = false, showTagline = true }: { compact?: boolean; mobileIcon?: boolean; showTagline?: boolean }) {
  return <Link to="/" className={`brand ${compact ? 'compact' : ''} ${mobileIcon ? 'mobile-icon' : ''}`} aria-label="Spikoo — Speak with confidence">
    <img className="brand-icon" src="/assets/spikoo-icon.png" alt="" width="100" height="100" />
    {!compact && <span className="brand-copy" aria-hidden="true">
      <span className="brand-wordmark"><span>sp</span><span className="brand-i">i</span><span>koo</span></span>
      {showTagline && <span className="brand-tagline">SPEAK WITH CONFIDENCE</span>}
    </span>}
  </Link>;
}
export function ThemeToggle() { const { dark, setTheme } = useTheme(); return <button className="icon-button theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={21} /> : <Moon size={21} />}</button>; }
