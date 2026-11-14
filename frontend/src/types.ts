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
  backendId?: string
  drug_name: string
  dosage: string
  ingredients: string
  notes: string
  times: string[]
}

export type DoseStatuses = Record<string, 'taken' | 'missed'>

export type TodayDose = {
  key: string
  medication: Medication
  time: string
  status: 'taken' | 'missed' | 'scheduled'
}

export type AppPage = 'overview' | 'schedule' | 'medications' | 'assistant'

export type ChatResponse = {
  answer: string
  source_leaflet?: string | null
  source_section?: string | null
  disclaimer: string
}
