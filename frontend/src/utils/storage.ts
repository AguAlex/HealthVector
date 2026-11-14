import type { AuthSession, DoseStatuses, Medication } from '../types'

const AUTH_KEY = 'healthvector.auth'

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

function userKey(userId: string, key: string): string {
  return `healthvector.${userId}.${key}`
}

export function readMedications(userId: string): Medication[] {
  return readValue<Medication[]>(userKey(userId, 'medications'), [])
}

export function saveMedications(userId: string, medications: Medication[]): void {
  localStorage.setItem(userKey(userId, 'medications'), JSON.stringify(medications))
}

export function readDoseStatuses(userId: string): DoseStatuses {
  return readValue<DoseStatuses>(userKey(userId, 'dose-statuses'), {})
}

export function saveDoseStatuses(userId: string, statuses: DoseStatuses): void {
  localStorage.setItem(userKey(userId, 'dose-statuses'), JSON.stringify(statuses))
}
