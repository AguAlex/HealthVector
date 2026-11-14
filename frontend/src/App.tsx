import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import MainHeader from './components/MainHeader'
import MainSlider from './components/MainSlider'
import type { AppPage, AuthSession, DoseStatuses, Medication, TodayDose } from './types'
import {
  addMedication as addBackendMedication,
  askAssistant,
  checkInteractions,
  getMedications,
  mergeRemoteMedications,
  register,
  removeMedication as removeBackendMedication,
  signIn,
} from './utils/api'
import { clearSession, readDoseStatuses, readMedications, readSession, saveDoseStatuses, saveMedications, saveSession } from './utils/storage'
import { getDosesForDate } from './utils/schedule'
import './App.css'

const AssistantPage = lazy(() => import('./pages/AssistantPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const MedicationsPage = lazy(() => import('./pages/MedicationsPage'))
const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))

function getPage(path: string): AppPage {
  if (path === '/schedule') return 'schedule'
  if (path === '/medications') return 'medications'
  if (path === '/assistant') return 'assistant'
  return 'overview'
}

function AppFrame() {
  const [session, setSession] = useState<AuthSession | null>(readSession)
  const [menuOpen, setMenuOpen] = useState(false)
  const [medications, setMedications] = useState<Medication[]>(() => session ? readMedications(session.user.id) : [])
  const [doseStatuses, setDoseStatuses] = useState<DoseStatuses>(() => session ? readDoseStatuses(session.user.id) : {})
  const [now, setNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [notice, setNotice] = useState('')
  const [interactionWarning, setInteractionWarning] = useState('')
  const [checkingInteractions, setCheckingInteractions] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const activePage = getPage(location.pathname)

  const todaysDoses = useMemo(
    () => getDosesForDate(now, medications, doseStatuses, now),
    [doseStatuses, medications, now],
  )
  const selectedDoses = useMemo(
    () => getDosesForDate(selectedDate, medications, doseStatuses, now),
    [doseStatuses, medications, now, selectedDate],
  )

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!session) return
    try {
      saveMedications(session.user.id, medications)
    } catch (error) {
      console.error('Unable to persist medication details.', error)
      setNotice('Medication details could not be saved on this device.')
    }
  }, [medications, session])

  useEffect(() => {
    if (!session) return
    try {
      saveDoseStatuses(session.user.id, doseStatuses)
    } catch (error) {
      console.error('Unable to persist dose statuses.', error)
      setNotice('Dose updates could not be saved on this device.')
    }
  }, [doseStatuses, session])

  useEffect(() => {
    if (!session) return
    let active = true
    getMedications(session.access_token)
      .then((remote) => {
        if (active) setMedications((local) => mergeRemoteMedications(remote, local))
      })
      .catch((error: unknown) => {
        if (!active) return
        if (error instanceof Error && error.message.startsWith('Your session has expired')) {
          clearSession()
          setSession(null)
          setNotice('')
          navigate('/login', { replace: true })
          return
        }
        setNotice(error instanceof Error ? `Backend connection: ${error.message}` : 'Could not load medications from the backend.')
      })
    return () => { active = false }
  }, [navigate, session])

  useEffect(() => {
    if (!session) return
    const missed = getDosesForDate(now, medications, doseStatuses, now)
      .filter((dose) => dose.status === 'missed' && !doseStatuses[dose.key])
    if (missed.length) {
      setDoseStatuses((current) => ({
        ...current,
        ...Object.fromEntries(missed.map((dose) => [dose.key, 'missed'])),
      }))
    }
  }, [doseStatuses, medications, now, session])

  const authenticate = async (
    input: { email: string; password: string; confirm_password?: string },
    isRegister: boolean,
  ) => isRegister
    ? register({ ...input, confirm_password: input.confirm_password ?? '' })
    : signIn(input)

  const onAuthenticated = (nextSession: AuthSession) => {
    try {
      saveSession(nextSession)
      setSession(nextSession)
      setMedications(readMedications(nextSession.user.id))
      setDoseStatuses(readDoseStatuses(nextSession.user.id))
      setNotice('')
      setInteractionWarning('')
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Unable to save the sign-in session.', error)
      setNotice('Could not save your sign-in on this device. Check your browser storage settings.')
    }
  }

  const signOut = () => {
    clearSession()
    setSession(null)
    setMedications([])
    setDoseStatuses({})
    setNotice('')
    setInteractionWarning('')
    navigate('/login', { replace: true })
  }

  const saveMedication = async (
    input: Omit<Medication, 'id'>,
    editId?: string,
  ) => {
    if (!session) return
    if (editId) {
      setMedications((current) => current.map((medication) => medication.id === editId
        ? { ...medication, ...input }
        : medication))
      setNotice('Medication details updated on this device. The backend stores medication names only.')
      return
    }

    if (medications.some((medication) => medication.drug_name.toLowerCase() === input.drug_name.toLowerCase())) {
      throw new Error('This medication is already in your list.')
    }

    const localMedication: Medication = { ...input, id: `local-${crypto.randomUUID()}` }
    setMedications((current) => [...current, localMedication])
    setNotice('')
    try {
      const saved = await addBackendMedication(session.access_token, input.drug_name)
      setMedications((current) => current.map((medication) => medication.id === localMedication.id
        ? { ...medication, backendId: saved.id }
        : medication))
    } catch (error) {
      setNotice(error instanceof Error
        ? `Saved on this device only. Backend sync: ${error.message}`
        : 'Saved on this device only. The backend could not sync this medication.')
    }
  }

  const removeMedication = (medication: Medication) => {
    if (!session || !window.confirm(`Remove ${medication.drug_name} and its schedule?`)) return
    setMedications((current) => current.filter((item) => item.id !== medication.id))
    setDoseStatuses((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.includes(`|${medication.id}|`)),
    ))
    if (medication.backendId) {
      void removeBackendMedication(session.access_token, medication.backendId).catch((error: unknown) => {
        setNotice(error instanceof Error
          ? `Removed from this device. Backend sync: ${error.message}`
          : 'Removed from this device, but backend sync failed.')
      })
    }
  }

  const updateDose = (dose: TodayDose, status: 'taken' | 'missed') => {
    setDoseStatuses((current) => ({ ...current, [dose.key]: status }))
  }

  const runInteractionCheck = async () => {
    if (!session) return
    setCheckingInteractions(true)
    setNotice('')
    try {
      const result = await checkInteractions(session.access_token)
      setInteractionWarning(result.has_interaction
        ? result.warning_message ?? `Review a possible interaction involving ${result.affected_drugs.join(', ')}.`
        : 'No interaction was flagged by the backend check. This is not a substitute for professional advice.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The interaction check failed.')
    } finally {
      setCheckingInteractions(false)
    }
  }

  if (!session) {
    return (
      <Suspense fallback={<div className="loading-screen">Getting things ready...</div>}>
        <Routes>
          <Route path="*" element={<AuthPage authenticate={authenticate} onAuthenticate={onAuthenticated} />} />
        </Routes>
      </Suspense>
    )
  }

  const navigateTo = (page: AppPage) => navigate(page === 'overview' ? '/' : `/${page}`)
  const hour = now.getHours()
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'

  return (
    <div className="app-shell">
      <MainHeader user={session.user} now={now} onMenuClick={() => setMenuOpen(true)} onSignOut={signOut} />
      <div className="app-body">
        <MainSlider activePage={activePage} onNavigate={navigateTo} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="main-content">
          {notice && <div className="global-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button></div>}
          <Suspense fallback={<div className="loading-screen">Getting things ready...</div>}>
            <Routes>
              <Route path="/" element={
                <OverviewPage
                  medications={medications}
                  doses={todaysDoses}
                  onTakeDose={(dose) => updateDose(dose, 'taken')}
                  onNavigate={navigateTo}
                  onAddMedication={() => navigate('/medications')}
                  greeting={greeting}
                  now={now}
                />
              } />
              <Route path="/schedule" element={
                <SchedulePage
                  doses={selectedDoses}
                  selectedDate={selectedDate}
                  now={now}
                  onChangeDate={setSelectedDate}
                  onTakeDose={(dose) => updateDose(dose, 'taken')}
                  onMarkMissed={(dose) => updateDose(dose, 'missed')}
                  onAddMedication={() => navigate('/medications')}
                />
              } />
              <Route path="/medications" element={
                <MedicationsPage
                  medications={medications}
                  onSave={saveMedication}
                  onRemove={removeMedication}
                  onCheckInteractions={() => void runInteractionCheck()}
                  interactionWarning={interactionWarning}
                  checkingInteractions={checkingInteractions}
                />
              } />
              <Route path="/assistant" element={
                <AssistantPage
                  user={session.user}
                  onAsk={(question) => askAssistant(session.access_token, question)}
                />
              } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppFrame />
    </BrowserRouter>
  )
}
