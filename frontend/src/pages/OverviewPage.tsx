import { ArrowForwardRounded, ChevronRightRounded, MedicationOutlined, ScheduleRounded } from '@mui/icons-material'
import { Button } from '@mui/material'
import type { AppPage, Medication } from '../types'

type Props = {
  medications: Medication[]
  onNavigate: (page: AppPage) => void
  onAddMedication: () => void
  greeting: string
  now: Date
}

export default function OverviewPage({
  medications,
  onNavigate,
  onAddMedication,
  greeting,
  now,
}: Props) {
  return (
    <div className="page-content overview-page">
      <section className="welcome-row">
        <div>
          <div className="eyebrow">{greeting}, YOU'RE DOING GREAT</div>
          <h1>Your health, <span>in rhythm.</span></h1>
          <p>Small steps, taken consistently, add up to something wonderful.</p>
        </div>
        <div className="date-pill"><span className="date-dot" />{new Intl.DateTimeFormat('en', {
          weekday: 'long', month: 'long', day: 'numeric',
        }).format(now)}</div>
      </section>

      <section className="overview-hero">
        <div className="hero-copy">
          <span className="hero-tag"><span /> YOUR MEDICATION LIST</span>
          <h2>Keep your care<br />in one place.</h2>
          <p>{medications.length
            ? `You have ${medications.length} medication${medications.length === 1 ? '' : 's'} in your list.`
            : 'Add a medication with a matching backend leaflet to get started.'}</p>
          <Button
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => medications.length ? onNavigate('medications') : onAddMedication()}
          >
            {medications.length ? 'View medications' : 'Add medication'}
          </Button>
        </div>
        <div className="hero-decoration hero-decoration-one" />
        <div className="hero-decoration hero-decoration-two" />
      </section>

      <section className="stat-grid" aria-label="Medication summary">
        <article className="stat-card">
          <div className="stat-icon lavender"><MedicationOutlined /></div>
          <div className="stat-label">Active medications</div>
          <div className="stat-value">{medications.length}<span> in your list</span></div>
          <button className="stat-link" onClick={() => onNavigate('medications')}>
            See medications <ChevronRightRounded />
          </button>
        </article>
        <article className="stat-card">
          <div className="stat-icon mint"><ScheduleRounded /></div>
          <div className="stat-label">Dose schedule</div>
          <div className="stat-value">Unavailable</div>
          <button className="stat-link" onClick={() => onNavigate('schedule')}>
            Why unavailable <ChevronRightRounded />
          </button>
        </article>
      </section>

      <section className="overview-lower">
        <article className="panel today-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">YOUR ROUTINE</div><h2>Dose tracking</h2></div>
          </div>
          <div className="empty-state compact-empty">
            <div className="empty-icon"><ScheduleRounded /></div>
            <strong>Dose schedules are not supported yet</strong>
            <p>The current backend supports medication names and removal, but not reminder times or dose statuses.</p>
          </div>
        </article>
        <article className="panel next-dose-panel">
          <div className="eyebrow">MEDICATIONS</div>
          <h2>{medications.length ? 'Your list is ready' : 'Start with your medication list'}</h2>
          <p>Only medication names with matching backend leaflet data can be added.</p>
          <Button onClick={() => onNavigate('medications')}>Open medications</Button>
        </article>
      </section>
      <div className="medical-disclaimer">
        <span>ⓘ</span> HealthVector helps you keep track of your routine and is not a substitute for medical advice.
      </div>
    </div>
  )
}
