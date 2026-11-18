import type { AuthSession, ChatResponse, Medication } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

type AuthInput = {
  email: string
  password: string
  confirm_password?: string
}

function localizeBackendMessage(message: string): string {
  const missingLeaflet = message.match(
    /^Medicamentul '(.+)' nu a fost găsit în baza de date cu prospecte \(nici în cele implicite, nici în cele adăugate de tine\)\.$/,
  )
  if (missingLeaflet) {
    return `Medication '${missingLeaflet[1]}' was not found in the leaflet database (default or user-added).`
  }
  if (message === 'Medicamentul nu a fost găsit în lista ta.') {
    return 'Medication was not found in your list.'
  }
  return message
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not connect to the backend: ${error.message}`
        : 'Could not connect to the backend.',
    )
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`
    try {
      const body: { detail?: string } = await response.json()
      if (body.detail) message = localizeBackendMessage(body.detail)
    } catch (error) {
      console.error('Could not read the backend error response.', error)
    }
    if (response.status === 401) {
      if (token) message = 'Your session has expired. Please sign in again.'
      else if (path === '/api/auth/login') message = 'Invalid email or password.'
    }
    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export function signIn(input: AuthInput): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function register(input: AuthInput & { confirm_password: string }): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function getMedications(token: string): Promise<Medication[]> {
  return request<Medication[]>('/api/medications', {}, token)
}

export function addMedication(token: string, drugName: string): Promise<Medication> {
  return request<Medication>(
    '/api/medications',
    { method: 'POST', body: JSON.stringify({ drug_name: drugName }) },
    token,
  )
}

export async function removeMedication(token: string, id: string): Promise<void> {
  await request<{ message: string }>(`/api/medications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, token)
}

export type InteractionCheck = {
  has_interaction: boolean
  warning_message?: string | null
  affected_drugs: string[]
}

export function checkInteractions(token: string): Promise<InteractionCheck> {
  return request<InteractionCheck>('/api/medications/interactions', {}, token)
}

export function askAssistant(token: string, question: string): Promise<ChatResponse> {
  return request<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ question }),
  }, token)
}
