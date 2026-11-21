import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { AppPage, AuthSession, ChatResponse, CustomLeafletInput, LeafletCatalogItem, Medication, MedicationDosing, ScheduleDaySummary, SchedulePayload } from './types'
import type { ColorTheme } from './utils/storage'

const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const MedicationsPage = lazy(() => import('./pages/MedicationsPage'))
const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))

type AuthenticateInput = {
  email: string
  password: string
  confirm_password?: string
}

type RouterProps =
  | {
      session: null
      authenticate: (input: AuthenticateInput, isRegister: boolean) => Promise<AuthSession>
      onAuthenticated: (session: AuthSession) => void
      theme: ColorTheme
      onToggleTheme: () => void
    }
  | {
      session: AuthSession
      medications: Medication[]
      catalog: LeafletCatalogItem[]
      schedule: SchedulePayload | null
      scheduleLoading: boolean
      scheduleWorking: boolean
      history: ScheduleDaySummary[]
      historyLoading: boolean
      onHistoryMonthChange: (year: number, month: number) => void
      now: Date
      onNavigate: (page: AppPage) => void
      onAddMedication: () => void
      greeting: string
      onSaveMedication: (drugName: string, dosing?: MedicationDosing) => Promise<void>
      onSaveCustomMedication: (input: CustomLeafletInput) => Promise<void>
      onRemoveMedication: (medication: Medication) => Promise<void>
      onCheckInteractions: () => void
      onReset: () => Promise<void>
      interactionWarning: string
      checkingInteractions: boolean
      onAskAssistant: (question: string) => Promise<ChatResponse>
      onGenerateSchedule: () => Promise<void>
      onApproveSchedule: () => Promise<void>
      onRejectSchedule: () => Promise<void>
      onSelectProposal: (proposalKey: string) => Promise<void>
      onSaveCustomSchedule: (doses: { drug_name: string; scheduled_time: string }[]) => Promise<void>
      onTakeDose: (doseId: string) => Promise<void>
      onMissDose: (doseId: string) => Promise<void>
      onExportSchedule: () => Promise<void>
    }

export default function Router(props: RouterProps) {
  if (props.session === null) {
    return (
      <Suspense fallback={<div className="loading-screen">Getting things ready...</div>}>
        <Routes>
          <Route
            path="*"
            element={
              <AuthPage
                authenticate={props.authenticate}
                onAuthenticate={props.onAuthenticated}
                theme={props.theme}
                onToggleTheme={props.onToggleTheme}
              />
            }
          />
        </Routes>
      </Suspense>
    )
  }

  const {
    session,
    medications,
    catalog,
    schedule,
    scheduleLoading,
    scheduleWorking,
    history,
    historyLoading,
    onHistoryMonthChange,
    now,
    onNavigate,
    onAddMedication,
    greeting,
    onSaveMedication,
    onSaveCustomMedication,
    onRemoveMedication,
    onCheckInteractions,
    onReset,
    interactionWarning,
    checkingInteractions,
    onAskAssistant,
    onGenerateSchedule,
    onApproveSchedule,
    onRejectSchedule,
    onSelectProposal,
    onSaveCustomSchedule,
    onTakeDose,
    onMissDose,
    onExportSchedule,
  } = props

  return (
    <Suspense fallback={<div className="loading-screen">Getting things ready...</div>}>
      <Routes>
        <Route
          path="/"
          element={
            <OverviewPage
              medications={medications}
              schedule={schedule}
              history={history}
              historyLoading={historyLoading}
              onHistoryMonthChange={onHistoryMonthChange}
              onNavigate={onNavigate}
              onAddMedication={onAddMedication}
              greeting={greeting}
              now={now}
            />
          }
        />
        <Route
          path="/schedule"
          element={
            <SchedulePage
              schedule={schedule}
              medications={medications}
              loading={scheduleLoading}
              working={scheduleWorking}
              onGenerate={onGenerateSchedule}
              onApprove={onApproveSchedule}
              onReject={onRejectSchedule}
              onTake={onTakeDose}
              onMiss={onMissDose}
              onSelectProposal={onSelectProposal}
              onSaveCustom={onSaveCustomSchedule}
              onExport={onExportSchedule}
              onReset={onReset}
              onAddMedication={onAddMedication}
            />
          }
        />
        <Route
          path="/medications"
          element={
            <MedicationsPage
              medications={medications}
              catalog={catalog}
              onSave={onSaveMedication}
              onSaveCustom={onSaveCustomMedication}
              onRemove={onRemoveMedication}
              onCheckInteractions={onCheckInteractions}
              onReset={onReset}
              interactionWarning={interactionWarning}
              checkingInteractions={checkingInteractions}
            />
          }
        />
        <Route
          path="/assistant"
          element={<AssistantPage user={session.user} onAsk={onAskAssistant} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
