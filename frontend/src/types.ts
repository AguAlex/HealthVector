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
  leaflet_id?: string | null
  side_effects?: string | null
}

export type AppPage = 'overview' | 'schedule' | 'medications' | 'assistant'

export type ChatResponse = {
  answer: string
  source_leaflet?: string | null
  source_section?: string | null
  disclaimer: string
  grounded?: boolean
  fallback?: boolean
}

export type Dose = {
  id: string
  schedule_id?: string | null
  drug_name: string
  scheduled_time: string
  status: 'scheduled' | 'taken' | 'missed' | string
  date: string
  due: boolean
}

export type ScheduleRecord = {
  id: string
  user_id: string
  date: string
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'BLOCKED' | 'SUPERSEDED' | string
  proposed_by: string
  interaction_severity?: string | null
  blocked_reason?: string | null
  approved_at?: string | null
}

export type SchedulePayload = {
  schedule: ScheduleRecord
  doses: Dose[]
  interaction?: {
    has_interaction?: boolean
    warning_message?: string | null
    severity?: string
    affected_drugs?: string[]
  } | null
  due_count: number
}
