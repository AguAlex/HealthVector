import type { AuthSession, ChatResponse, Medication } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

type AuthInput = {
  email: string
  password: string
  confirm_password?: string
}

type BackendMedication = {
  id: string
  drug_name: string
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
      if (body.detail) message = body.detail
    } catch (error) {
      console.error('Could not read the backend error response.', error)
    }
    if (response.status === 401) message = 'Your session has expired. Please sign in again.'
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

export async function getMedications(token: string): Promise<BackendMedication[]> {
  return request<BackendMedication[]>('/api/medications', {}, token)
}

export function addMedication(token: string, drugName: string): Promise<BackendMedication> {
  return request<BackendMedication>(
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

export function mergeRemoteMedications(
  remote: BackendMedication[],
  local: Medication[],
): Medication[] {
  const remoteMedications = remote.map((item) => {
    const saved = local.find(
      (medication) => medication.drug_name.toLowerCase() === item.drug_name.toLowerCase(),
    )
    return saved ? { ...saved, backendId: item.id } : {
      id: item.id,
      backendId: item.id,
      drug_name: item.drug_name,
      dosage: '',
      ingredients: '',
      notes: '',
      times: [],
    }
  })
  const localOnly = local.filter((medication) => medication.id.startsWith('local-'))
  return [...remoteMedications, ...localOnly.filter((medication) =>
    !remoteMedications.some((remoteMedication) =>
      remoteMedication.drug_name.toLowerCase() === medication.drug_name.toLowerCase(),
    ),
  )]
}
