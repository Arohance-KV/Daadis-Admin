import { useCallback, useEffect, useState } from 'react';
import { resolveTheme, getStoredTheme, applyTheme } from '../lib/theme.js';

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    resolveTheme(getStoredTheme(), window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
