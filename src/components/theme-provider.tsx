'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSession } from 'next-auth/react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'ui-theme'

type ThemeContextValue = {
  /** User-selected preference (may be 'system'). */
  preference: ThemePreference
  /** Actually applied theme — never 'system'. */
  resolved: ResolvedTheme
  /** Whether the preference has been loaded from the server yet. */
  isSynced: boolean
  /** Change theme. Persists to localStorage + server (if authenticated). */
  setTheme: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', resolved)
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  // Initialized lazily on client; on server we assume 'dark' which matches the
  // pre-hydration script default.
  const [preference, setPreferenceState] = useState<ThemePreference>('dark')
  const [resolved, setResolved] = useState<ResolvedTheme>('dark')
  const [isSynced, setIsSynced] = useState(false)
  const hasHydratedRef = useRef(false)

  // Hydrate from localStorage on mount. This runs after the pre-hydration
  // script has already applied the correct attribute, so there's no flash.
  useEffect(() => {
    const fromStorage = readStoredPreference()
    setPreferenceState(fromStorage)
    const nextResolved = fromStorage === 'system' ? resolveSystemTheme() : fromStorage
    setResolved(nextResolved)
    hasHydratedRef.current = true
  }, [])

  // Once the session resolves, fetch the server-stored preference and
  // reconcile: server is source of truth when it exists.
  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.id) {
      if (status !== 'loading') setIsSynced(true)
      return
    }
    let cancelled = false
    fetch('/api/me/theme', { cache: 'no-store' })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.themePreference) return
        const serverPref = data.themePreference as ThemePreference
        const localPref = readStoredPreference()
        // If user changed theme locally while signed-out and has now signed in,
        // keep the local choice and push it up. Otherwise trust the server.
        if (localPref !== serverPref && window.localStorage.getItem(THEME_STORAGE_KEY)) {
          void persistToServer(localPref)
        } else {
          setPreferenceState(serverPref)
          const nextResolved = serverPref === 'system' ? resolveSystemTheme() : serverPref
          setResolved(nextResolved)
          applyTheme(nextResolved)
          window.localStorage.setItem(THEME_STORAGE_KEY, serverPref)
        }
      })
      .catch(() => {
        // Silent — fall back to localStorage value already applied.
      })
      .finally(() => {
        if (!cancelled) setIsSynced(true)
      })
    return () => {
      cancelled = true
    }
  }, [status, session?.user?.id])

  // Listen for system theme changes when preference is 'system'.
  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      const next: ResolvedTheme = e.matches ? 'dark' : 'light'
      setResolved(next)
      applyTheme(next)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [preference])

  const setTheme = useCallback((next: ThemePreference) => {
    setPreferenceState(next)
    const nextResolved = next === 'system' ? resolveSystemTheme() : next
    setResolved(nextResolved)
    applyTheme(nextResolved)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // localStorage disabled — non-fatal
    }
    void persistToServer(next)
  }, [])

  return (
    <ThemeContext.Provider value={{ preference, resolved, isSynced, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

async function persistToServer(preference: ThemePreference) {
  try {
    await fetch('/api/me/theme', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themePreference: preference }),
    })
  } catch {
    // Silent — localStorage still holds the pref; we'll retry on next change.
  }
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

/**
 * Inline script that sets data-theme on <html> before React hydrates, so the
 * user never sees a flash of the wrong theme. Render inside <head>.
 */
export const THEME_PREHYDRATION_SCRIPT = `
(function(){
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var theme;
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    } else if (stored === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      theme = 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`.trim()
