import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import MainHeader from './components/MainHeader'
import MainSlider from './components/MainSlider'
import DisclaimerBanner from './components/DisclaimerBanner'
import type { AppPage, AuthSession, CustomLeafletInput, Medication, ScheduleDaySummary, SchedulePayload } from './types'
import Router from './Router'
import {
  addMedication as addBackendMedication,
  createCustomLeaflet,
  approveSchedule,
  askAssistant,
  checkInteractions,
  exportScheduleText,
  generateSchedule,
  getMedications,
  getScheduleHistory,
  getTodaySchedule,
  markDoseMissed,
  markDoseTaken,
  register,
  rejectSchedule,
  removeMedication as removeBackendMedication,
  resetDashboard,
  signIn,
  updateDoseTime,
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
  const [schedule, setSchedule] = useState<SchedulePayload | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleWorking, setScheduleWorking] = useState(false)
  const [history, setHistory] = useState<ScheduleDaySummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyMonth, setHistoryMonth] = useState(() => {
    const today = new Date()
    return { year: today.getFullYear(), month: today.getMonth() }
  })
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

  const monthRange = (year: number, month: number) => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0)
    const iso = (value: Date) => {
      const mm = String(value.getMonth() + 1).padStart(2, '0')
      const dd = String(value.getDate()).padStart(2, '0')
      return `${value.getFullYear()}-${mm}-${dd}`
    }
    return { start: iso(start), end: iso(end) }
  }

  const loadHistory = useCallback(async (token: string, year: number, month: number) => {
    setHistoryLoading(true)
    try {
      const { start, end } = monthRange(year, month)
      setHistory(await getScheduleHistory(token, start, end))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load the adherence calendar.')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const loadSchedule = useCallback(async (token: string) => {
    setScheduleLoading(true)
    try {
      setSchedule(await getTodaySchedule(token))
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load the schedule.')
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  const applyInteractionResult = useCallback(async (token: string) => {
    const result = await checkInteractions(token)
    setInteractionWarning(result.has_interaction
      ? result.warning_message ?? `Review a possible interaction involving ${result.affected_drugs.join(', ')}.`
      : '')
  }, [])

  useEffect(() => {
    if (!session) return
    let active = true
    Promise.all([
      getMedications(session.access_token),
      getTodaySchedule(session.access_token),
    ])
      .then(async ([remote, today]) => {
        if (!active) return
        setMedications(remote)
        setSchedule(today)
        if (remote.length > 1) {
          try {
            await applyInteractionResult(session.access_token)
          } catch {
            /* keep list usable */
          }
        }
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
  }, [applyInteractionResult, navigate, session])

  useEffect(() => {
    if (!session) return
    void loadHistory(session.access_token, historyMonth.year, historyMonth.month)
  }, [historyMonth.month, historyMonth.year, loadHistory, session])

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
      setSchedule(null)
      setHistory([])
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
    setSchedule(null)
    setHistory([])
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
    const nextList = [...medications, saved]
    setMedications(nextList)
    setNotice('')
    if (nextList.length > 1) {
      await applyInteractionResult(session.access_token)
    }
  }

  const saveCustomMedication = async (input: CustomLeafletInput) => {
    if (!session) return
    if (medications.some((medication) => medication.drug_name.toLowerCase() === input.drug_name.toLowerCase())) {
      throw new Error('This medication is already in your list.')
    }

    const sections: Record<string, string> = {}
    if (input.posology) sections['4.2'] = input.posology
    if (input.side_effects) sections['4.8'] = input.side_effects
    if (input.interactions) sections['4.5'] = input.interactions

    try {
      await createCustomLeaflet(session.access_token, {
        drug_name: input.drug_name,
        leaflet_text: input.leaflet_text,
        sections,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message !== 'You already added a custom leaflet for this medication.') {
        throw error
      }
    }

    await saveMedication(input.drug_name)
  }

  const removeMedication = async (medication: Medication) => {
    if (!session) return
    await removeBackendMedication(session.access_token, medication.id)
    setMedications((current) => current.filter((item) => item.id !== medication.id))
    setNotice('')
    await loadSchedule(session.access_token)
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

  const runReset = async () => {
    if (!session) return
    if (!window.confirm('Clear your medication list and schedule?')) return
    await resetDashboard(session.access_token)
    setMedications([])
    setSchedule(null)
    setHistory([])
    setInteractionWarning('')
    setNotice('Your dashboard was reset.')
  }

  const withScheduleWork = async (task: () => Promise<void>) => {
    if (!session) return
    setScheduleWorking(true)
    setNotice('')
    try {
      await task()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The schedule request failed.')
    } finally {
      setScheduleWorking(false)
    }
  }

  const refreshHistory = async (token: string) => {
    await loadHistory(token, historyMonth.year, historyMonth.month)
  }

  const onGenerateSchedule = () => withScheduleWork(async () => {
    if (!session) return
    setSchedule(await generateSchedule(session.access_token))
    await refreshHistory(session.access_token)
  })

  const onApproveSchedule = () => withScheduleWork(async () => {
    if (!session || !schedule) return
    setSchedule(await approveSchedule(session.access_token, schedule.schedule.id))
    await refreshHistory(session.access_token)
  })

  const onRejectSchedule = () => withScheduleWork(async () => {
    if (!session || !schedule) return
    await rejectSchedule(session.access_token, schedule.schedule.id)
    setSchedule(null)
    await refreshHistory(session.access_token)
  })

  const onTakeDose = (doseId: string) => withScheduleWork(async () => {
    if (!session) return
    await markDoseTaken(session.access_token, doseId)
    await loadSchedule(session.access_token)
    await refreshHistory(session.access_token)
  })

  const onMissDose = (doseId: string) => withScheduleWork(async () => {
    if (!session) return
    await markDoseMissed(session.access_token, doseId)
    await loadSchedule(session.access_token)
    await refreshHistory(session.access_token)
  })

  const onUpdateDoseTime = (doseId: string, scheduledTime: string) => withScheduleWork(async () => {
    if (!session) return
    setSchedule(await updateDoseTime(session.access_token, doseId, scheduledTime))
  })

  const onExportSchedule = async () => {
    if (!session) return
    try {
      const text = await exportScheduleText(session.access_token)
      await navigator.clipboard.writeText(text)
      setNotice('Schedule copied to the clipboard.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not export the schedule.')
    }
  }

  const navigateTo = (page: AppPage) => navigate(page === 'overview' ? '/' : `/${page}`)
  const dueCount = schedule?.schedule.status === 'APPROVED' ? schedule.due_count : 0

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
      <DisclaimerBanner />
      <MainHeader
        user={session.user}
        now={now}
        theme={theme}
        dueCount={dueCount}
        onToggleTheme={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
        onMenuClick={() => setMenuOpen(true)}
        onSignOut={signOut}
        onOpenSchedule={() => navigateTo('schedule')}
      />
      <div className="app-body">
        <MainSlider activePage={activePage} onNavigate={navigateTo} open={menuOpen} onClose={() => setMenuOpen(false)} />
        <main className="main-content">
          {notice && <div className="global-notice" role="status"><span>{notice}</span><button onClick={() => setNotice('')}>Dismiss</button></div>}
          <Router
            session={session}
            medications={medications}
            schedule={schedule}
            scheduleLoading={scheduleLoading}
            scheduleWorking={scheduleWorking}
            history={history}
            historyLoading={historyLoading}
            onHistoryMonthChange={(year, month) => {
              setHistoryMonth({ year, month })
            }}
            now={now}
            onNavigate={navigateTo}
            onAddMedication={() => navigate('/medications')}
            greeting={greeting}
            onSaveMedication={saveMedication}
            onSaveCustomMedication={saveCustomMedication}
            onRemoveMedication={removeMedication}
            onCheckInteractions={() => void runInteractionCheck()}
            onReset={runReset}
            interactionWarning={interactionWarning}
            checkingInteractions={checkingInteractions}
            onAskAssistant={(question) => askAssistant(session.access_token, question)}
            onGenerateSchedule={onGenerateSchedule}
            onApproveSchedule={onApproveSchedule}
            onRejectSchedule={onRejectSchedule}
            onTakeDose={onTakeDose}
            onMissDose={onMissDose}
            onUpdateDoseTime={onUpdateDoseTime}
            onExportSchedule={onExportSchedule}
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
