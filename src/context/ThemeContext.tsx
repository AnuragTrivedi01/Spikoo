import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Theme } from '../types';
const ThemeContext = createContext<{ theme: Theme; dark: boolean; setTheme: (value: Theme) => void }>({ theme: 'light', dark: false, setTheme: () => undefined });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => { try { const saved = localStorage.getItem('spikoo-theme'); return saved === 'dark' || saved === 'system' ? saved : 'light'; } catch { return 'light'; } });
  const [systemDark, setSystemDark] = useState(matchMedia('(prefers-color-scheme: dark)').matches);
  const dark = theme === 'dark' || (theme === 'system' && systemDark);
  useEffect(() => { const query = matchMedia('(prefers-color-scheme: dark)'); const change = () => setSystemDark(query.matches); query.addEventListener('change', change); return () => query.removeEventListener('change', change); }, []);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem('spikoo-theme', theme); } catch { /* preferences are optional */ } }, [theme, dark]);
  return <ThemeContext.Provider value={{ theme, dark, setTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
