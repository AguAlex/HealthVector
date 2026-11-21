export type User = {
  id: string
  email: string
}

export type AuthSession = {
  access_token: string
  token_type: string
  user: User
}

export type MedicationDosing = {
  doses_per_day: number
  interval_hours: number
  quantity?: string
}

export type Medication = {
  id: string
  user_id: string
  drug_name: string
  added_at: string
  leaflet_id?: string | null
  side_effects?: string | null
  dosing?: MedicationDosing | null
}

export type LeafletCatalogItem = {
  drug_name: string
  is_default: boolean
  suggested_doses_per_day?: number
  suggested_interval_hours?: number
  suggested_quantity?: string | null
}

export type CustomLeafletInput = {
  drug_name: string
  leaflet_text: string
  dosing: MedicationDosing
  side_effects?: string
  interactions?: string
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
  quantity?: string | null
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
  selected_proposal?: string | null
}

export type ScheduleProposalDose = {
  drug_name: string
  scheduled_time: string
  quantity?: string | null
}

export type ScheduleProposal = {
  key: string
  label: string
  summary: string
  doses: ScheduleProposalDose[]
}

export type SchedulePayload = {
  schedule: ScheduleRecord
  doses: Dose[]
  proposals?: ScheduleProposal[]
  interaction?: {
    has_interaction?: boolean
    warning_message?: string | null
    severity?: string
    affected_drugs?: string[]
  } | null
  due_count: number
}

export type ScheduleDaySummary = {
  date: string
  schedule_id: string
  status: string
  total_doses: number
  taken_count: number
  missed_count: number
  all_taken: boolean
}
