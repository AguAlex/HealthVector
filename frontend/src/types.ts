export type User = {
  id: string
  email: string
}

export type AuthSession = {
  access_token: string
  token_type: string
  user: User
}

export type Medication = {
  id: string
  user_id: string
  drug_name: string
  added_at: string
}

export type AppPage = 'overview' | 'schedule' | 'medications' | 'assistant'

export type ChatResponse = {
  answer: string
  source_leaflet?: string | null
  source_section?: string | null
  disclaimer: string
}
