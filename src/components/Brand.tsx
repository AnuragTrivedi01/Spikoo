import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
export function SpikooLogo({ compact = false, mobileIcon = false }: { compact?: boolean; mobileIcon?: boolean }) { return <Link to="/" className={`brand ${compact ? 'compact' : ''} ${mobileIcon ? 'mobile-icon' : ''}`} aria-label="Spikoo home"><picture>{mobileIcon && <source media="(max-width: 800px)" srcSet="/assets/spikoo-icon.png" />}<img src={`/assets/spikoo-${compact ? 'icon' : 'logo'}.png`} alt="Spikoo — Speak. Learn. Grow." width={compact ? 172 : 714} height={compact ? 117 : 182} /></picture></Link>; }
export function ThemeToggle() { const { dark, setTheme } = useTheme(); return <button className="icon-button theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={() => setTheme(dark ? 'light' : 'dark')}>{dark ? <Sun size={21} /> : <Moon size={21} />}</button>; }
