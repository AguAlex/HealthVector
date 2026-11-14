import {
  ArrowForwardRounded,
  CheckCircleOutlineRounded,
  ChevronRightRounded,
  MedicationOutlined,
  ScheduleRounded,
  TrendingUpRounded,
} from '@mui/icons-material'
import { Button } from '@mui/material'
import type { Medication, TodayDose } from '../types'

type Props = {
  medications: Medication[]
  doses: TodayDose[]
  onTakeDose: (dose: TodayDose) => void
  onNavigate: (page: 'schedule' | 'medications' | 'assistant') => void
  onAddMedication: () => void
  greeting: string
  now: Date
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hours, minutes),
  )
}

export default function OverviewPage({
  medications,
  doses,
  onTakeDose,
  onNavigate,
  onAddMedication,
  greeting,
  now,
}: Props) {
  const takenCount = doses.filter((dose) => dose.status === 'taken').length
  const progress = doses.length ? Math.round((takenCount / doses.length) * 100) : 0
  const nextDose = doses.find((dose) => dose.status === 'scheduled')

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
          <span className="hero-tag"><span /> YOUR DAILY CHECK-IN</span>
          <h2>A little care goes<br />a long way.</h2>
          <p>{doses.length
            ? `You have ${doses.length - takenCount} dose${doses.length - takenCount === 1 ? '' : 's'} left in your schedule today. Keep it up!`
            : 'Build a simple routine that works for you. Add a medication to get started.'}</p>
          <Button
            variant="contained"
            endIcon={<ArrowForwardRounded />}
            onClick={() => doses.length ? onNavigate('schedule') : onAddMedication()}
          >
            {doses.length ? 'View today’s schedule' : 'Set up my schedule'}
          </Button>
        </div>
        <div className="hero-progress">
          <div className="progress-ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}>
            <div className="progress-ring-center">
              <strong>{progress}<span>%</span></strong>
              <span>today</span>
            </div>
          </div>
          <div className="progress-caption"><CheckCircleOutlineRounded /> {takenCount} of {doses.length} taken</div>
        </div>
        <div className="hero-decoration hero-decoration-one" />
        <div className="hero-decoration hero-decoration-two" />
      </section>

      <section className="stat-grid" aria-label="Medication summary">
        <article className="stat-card">
          <div className="stat-icon lavender"><MedicationOutlined /></div>
          <div className="stat-label">Active medications</div>
          <div className="stat-value">{medications.length}<span> in your plan</span></div>
          <button className="stat-link" onClick={() => onNavigate('medications')}>See medications <ChevronRightRounded /></button>
        </article>
        <article className="stat-card">
          <div className="stat-icon mint"><ScheduleRounded /></div>
          <div className="stat-label">Today’s doses</div>
          <div className="stat-value">{doses.length}<span> scheduled</span></div>
          <button className="stat-link" onClick={() => onNavigate('schedule')}>Open schedule <ChevronRightRounded /></button>
        </article>
        <article className="stat-card stat-card-progress">
          <div className="stat-icon peach"><TrendingUpRounded /></div>
          <div className="stat-label">Daily consistency</div>
          <div className="stat-value">{progress}<span>% today</span></div>
          <div className="mini-progress"><span style={{ width: `${progress}%` }} /></div>
        </article>
      </section>

      <section className="overview-lower">
        <article className="panel today-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">YOUR ROUTINE</div><h2>Today’s schedule</h2></div>
            <button className="panel-action" onClick={() => onNavigate('schedule')}>See all <ArrowForwardRounded /></button>
          </div>
          {doses.length ? (
            <div className="today-dose-list">
              {doses.slice(0, 4).map((dose) => (
                <div className={`today-dose-row status-${dose.status}`} key={dose.key}>
                  <div className="dose-time">{formatTime(dose.time)}</div>
                  <div className="dose-marker" />
                  <div className="dose-info">
                    <strong>{dose.medication.drug_name}</strong>
                    <span>{dose.medication.dosage || 'Dose details not added'}</span>
                  </div>
                  {dose.status === 'scheduled' ? (
                    <Button size="small" variant="outlined" onClick={() => onTakeDose(dose)}>Mark taken</Button>
                  ) : <span className="dose-status">{dose.status === 'taken' ? 'Taken' : 'Missed'}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty">
              <div className="empty-icon"><ScheduleRounded /></div>
              <strong>Your schedule is ready when you are</strong>
              <p>Add your first medication and choose reminder times.</p>
              <Button onClick={onAddMedication}>Add medication</Button>
            </div>
          )}
        </article>
        <article className="panel next-dose-panel">
          <div className="eyebrow">UP NEXT</div>
          <h2>{nextDose ? 'A gentle reminder' : 'You’re all caught up'}</h2>
          {nextDose ? (
            <>
              <div className="next-dose-time">{formatTime(nextDose.time)}</div>
              <div className="next-dose-name">{nextDose.medication.drug_name}</div>
              <p>{nextDose.medication.dosage || 'Take as directed by your healthcare provider.'}</p>
              <div className="next-dose-note"><span>✦</span> You’ve got this. One dose at a time.</div>
            </>
          ) : (
            <>
              <div className="caught-up-illustration"><CheckCircleOutlineRounded /></div>
              <p>{doses.length ? 'You’ve completed all of today’s scheduled doses.' : 'Your next step is adding a medication to your plan.'}</p>
            </>
          )}
        </article>
      </section>
      <div className="medical-disclaimer">
        <span>ⓘ</span> HealthVector helps you keep track of your routine and is not a substitute for medical advice.
      </div>
    </div>
  )
}
