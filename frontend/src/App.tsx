import { useEffect, useState } from 'react'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import MainHeader from './components/MainHeader'
import MainSlider from './components/MainSlider'
import type { AppPage, AuthSession, Medication } from './types'
import Router from './Router'
import {
  addMedication as addBackendMedication,
  askAssistant,
  checkInteractions,
  getMedications,
  register,
  removeMedication as removeBackendMedication,
  signIn,
} from './utils/api'
import { clearSession, readColorTheme, readSession, saveColorTheme, saveSession, type ColorTheme } from './utils/storage'
import './App.css'

function getPage(path: string): AppPage {
  if (path === '/schedule') return 'schedule'
  if (path === '/medications') return 'medications'
  if (path === '/assistant') return 'assistant'
  return 'overview'
}

function AppFrame() {
  const [session, setSession] = useState<AuthSession | null>(readSession)
  const [theme, setTheme] = useState<ColorTheme>(readColorTheme)
  const [menuOpen, setMenuOpen] = useState(false)
  const [medications, setMedications] = useState<Medication[]>([])
  const [now, setNow] = useState(() => new Date())
  const [notice, setNotice] = useState('')
  const [interactionWarning, setInteractionWarning] = useState('')
  const [checkingInteractions, setCheckingInteractions] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const activePage = getPage(location.pathname)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    saveColorTheme(theme)
  }, [theme])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!session) return
    let active = true
    getMedications(session.access_token)
      .then((remote) => {
        if (!active) return
        setMedications(remote)
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
      setMedications([])
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
    setNotice('')
    setInteractionWarning('')
    navigate('/login', { replace: true })
  }

  const saveMedication = async (drugName: string) => {
    if (!session) return
    if (medications.some((medication) => medication.drug_name.toLowerCase() === drugName.toLowerCase())) {
      throw new Error('This medication is already in your list.')
    }

    const saved = await addBackendMedication(session.access_token, drugName)
    setMedications((current) => [...current, saved])
    setNotice('')
  }

  const removeMedication = async (medication: Medication) => {
    if (!session) return
    await removeBackendMedication(session.access_token, medication.id)
    setMedications((current) => current.filter((item) => item.id !== medication.id))
    setNotice('')
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

  const navigateTo = (page: AppPage) => navigate(page === 'overview' ? '/' : `/${page}`)

  if (!session) {
    return (
      <Router
        session={null}
        authenticate={authenticate}
        onAuthenticated={onAuthenticated}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
      />
    )
  }

  const hour = now.getHours()
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'

  return (
    <div className="app-shell">
      <MainHeader
        user={session.user}
        now={now}
        theme={theme}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        onMenuClick={() => setMenuOpen(true)}
        onSignOut={signOut}
      />
      <div className="app-body">
        <MainSlider activePage={activePage} onNavigate={navigateTo} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="main-content">
          {notice && <div className="global-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button></div>}
          <Router
            session={session}
            medications={medications}
            now={now}
            onNavigate={navigateTo}
            onAddMedication={() => navigate('/medications')}
            greeting={greeting}
            onSaveMedication={saveMedication}
            onRemoveMedication={removeMedication}
            onCheckInteractions={() => void runInteractionCheck()}
            interactionWarning={interactionWarning}
            checkingInteractions={checkingInteractions}
            onAskAssistant={(question) => askAssistant(session.access_token, question)}
          />
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
