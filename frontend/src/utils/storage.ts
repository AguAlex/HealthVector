import type { AuthSession } from '../types'

const AUTH_KEY = 'healthvector.auth'
const THEME_KEY = 'healthvector.theme'

export type ColorTheme = 'light' | 'dark'

function readValue<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    console.error(`Unable to read saved app data for "${key}".`, error)
    return fallback
  }
}

export function readSession(): AuthSession | null {
  return readValue<AuthSession | null>(AUTH_KEY, null)
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(AUTH_KEY)
}

export function readColorTheme(): ColorTheme {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch (error) {
    console.error('Unable to read the saved color theme.', error)
    return 'light'
  }
}

export function saveColorTheme(theme: ColorTheme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch (error) {
    console.error('Unable to save the color theme preference.', error)
  }
}
