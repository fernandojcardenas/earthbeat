import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Preferences {
  highContrast: boolean;
  reducedMotion: boolean;
  reducedIntensity: boolean;
  liveDescriptions: boolean;
}

interface PreferencesContextValue extends Preferences {
  set: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const STORAGE_KEY = 'earthbeat.preferences.v1';

function systemReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function load(): Preferences {
  const defaults: Preferences = {
    highContrast: false,
    reducedMotion: systemReducedMotion(),
    reducedIntensity: false,
    liveDescriptions: true,
  };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(load);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.contrast = prefs.highContrast ? 'high' : 'normal';
    root.dataset.motion = prefs.reducedMotion ? 'reduce' : 'full';
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable: preferences last for this visit only */
    }
  }, [prefs]);

  const value = useMemo<PreferencesContextValue>(
    () => ({ ...prefs, set: (key, v) => setPrefs((p) => ({ ...p, [key]: v })) }),
    [prefs],
  );
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
