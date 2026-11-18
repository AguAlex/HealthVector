import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import type { AppPage, AuthSession, ChatResponse, Medication } from './types'
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
      now: Date
      onNavigate: (page: AppPage) => void
      onAddMedication: () => void
      greeting: string
      onSaveMedication: (drugName: string) => Promise<void>
      onRemoveMedication: (medication: Medication) => Promise<void>
      onCheckInteractions: () => void
      interactionWarning: string
      checkingInteractions: boolean
      onAskAssistant: (question: string) => Promise<ChatResponse>
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
    now,
    onNavigate,
    onAddMedication,
    greeting,
    onSaveMedication,
    onRemoveMedication,
    onCheckInteractions,
    interactionWarning,
    checkingInteractions,
    onAskAssistant,
  } = props

  return (
    <Suspense fallback={<div className="loading-screen">Getting things ready...</div>}>
      <Routes>
        <Route
          path="/"
          element={
            <OverviewPage
              medications={medications}
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
              onAddMedication={onAddMedication}
            />
          }
        />
        <Route
          path="/medications"
          element={
            <MedicationsPage
              medications={medications}
              onSave={onSaveMedication}
              onRemove={onRemoveMedication}
              onCheckInteractions={onCheckInteractions}
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
