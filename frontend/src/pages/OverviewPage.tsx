import { useMemo, useState } from 'react'
import {
  ArrowForwardRounded,
  ChevronLeftRounded,
  ChevronRightRounded,
  MedicationOutlined,
  ScheduleRounded,
} from '@mui/icons-material'
import { Button, IconButton } from '@mui/material'
import type { AppPage, Medication, ScheduleDaySummary, SchedulePayload } from '../types'

type Props = {
  medications: Medication[]
  schedule: SchedulePayload | null
  history: ScheduleDaySummary[]
  historyLoading: boolean
  onHistoryMonthChange: (year: number, month: number) => void
  onNavigate: (page: AppPage) => void
  onAddMedication: () => void
  greeting: string
  now: Date
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1)
}

function isoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calendarCells(year: number, month: number) {
  const first = startOfMonth(year, month)
  const weekday = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - weekday)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function dayLabel(summary: ScheduleDaySummary | undefined) {
  if (!summary) return 'No schedule'
  if (summary.all_taken) return `All ${summary.total_doses} doses taken`
  if (summary.status !== 'APPROVED') return `${summary.status.replaceAll('_', ' ').toLowerCase()} · not fully taken`
  return `${summary.taken_count} of ${summary.total_doses} taken`
}

export default function OverviewPage({
  medications,
  schedule,
  history,
  historyLoading,
  onHistoryMonthChange,
  onNavigate,
  onAddMedication,
  greeting,
  now,
}: Props) {
  const [cursor, setCursor] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }))
  const doses = schedule?.doses ?? []
  const approved = schedule?.schedule.status === 'APPROVED'
  const due = approved ? doses.filter((dose) => dose.due && dose.status === 'scheduled') : []
  const next = approved
    ? doses.find((dose) => dose.status === 'scheduled')
    : undefined
  const todayIso = isoDate(now)
  const byDate = useMemo(
    () => Object.fromEntries(history.map((day) => [day.date, day])),
    [history],
  )
  const cells = calendarCells(cursor.year, cursor.month)
  const monthTitle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    startOfMonth(cursor.year, cursor.month),
  )

  const shiftMonth = (delta: number) => {
    const nextDate = new Date(cursor.year, cursor.month + delta, 1)
    const nextCursor = { year: nextDate.getFullYear(), month: nextDate.getMonth() }
    setCursor(nextCursor)
    onHistoryMonthChange(nextCursor.year, nextCursor.month)
  }

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

      {due.length > 0 && (
        <div className="inline-notice warning-notice dose-alert" role="alert">
          <strong>Dose time reached</strong>
          <span>
            {due.map((dose) => `${dose.scheduled_time} ${dose.drug_name}`).join(' · ')}.
            Open the schedule to mark Take or Miss.
          </span>
        </div>
      )}
      {schedule?.schedule.status === 'BLOCKED' && (
        <div className="inline-notice error-notice" role="alert">
          <strong>Schedule blocked</strong>
          <span>{schedule.schedule.blocked_reason}</span>
        </div>
      )}

      <section className="overview-hero">
        <div className="hero-copy">
          <span className="hero-tag"><span /> YOUR MEDICATION LIST</span>
          <h2>Keep your care<br />in one place.</h2>
          <p>{medications.length
            ? `You have ${medications.length} medication${medications.length === 1 ? '' : 's'} in your list.`
            : 'Add a catalog medication, or paste your own leaflet to get started.'}</p>
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
          <div className="stat-value">{schedule ? schedule.schedule.status.replaceAll('_', ' ') : 'Not generated'}</div>
          <button className="stat-link" onClick={() => onNavigate('schedule')}>
            Open schedule <ChevronRightRounded />
          </button>
        </article>
      </section>

      <section className="panel adherence-calendar" aria-label="Medication adherence calendar">
        <div className="panel-heading calendar-heading">
          <div>
            <div className="eyebrow">ADHERENCE</div>
            <h2>Did you take every dose?</h2>
          </div>
          <div className="calendar-nav">
            <IconButton aria-label="Previous month" onClick={() => shiftMonth(-1)} size="small">
              <ChevronLeftRounded />
            </IconButton>
            <strong>{monthTitle}</strong>
            <IconButton aria-label="Next month" onClick={() => shiftMonth(1)} size="small">
              <ChevronRightRounded />
            </IconButton>
          </div>
        </div>
        <p className="calendar-copy">
          Days with a generated schedule show whether every planned medication was taken.
        </p>
        <div className="calendar-legend">
          <span><i className="legend-dot complete" /> All taken</span>
          <span><i className="legend-dot incomplete" /> Not all taken</span>
          <span><i className="legend-dot empty" /> No schedule</span>
        </div>
        <div className="calendar-weekdays">
          {WEEKDAYS.map((label) => <span key={label}>{label}</span>)}
        </div>
        <div className={`calendar-grid${historyLoading ? ' is-loading' : ''}`}>
          {cells.map((date) => {
            const key = isoDate(date)
            const inMonth = date.getMonth() === cursor.month
            const summary = byDate[key]
            const state = !summary ? 'empty' : summary.all_taken ? 'complete' : 'incomplete'
            const isToday = key === todayIso
            return (
              <button
                key={key}
                type="button"
                className={`calendar-day ${state}${inMonth ? '' : ' outside'}${isToday ? ' is-today' : ''}`}
                title={`${key}: ${dayLabel(summary)}`}
                onClick={() => {
                  if (key === todayIso) onNavigate('schedule')
                }}
              >
                <span className="calendar-day-number">{date.getDate()}</span>
                {summary && (
                  <span className="calendar-day-mark" aria-hidden>
                    {summary.all_taken ? '✓' : '!'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="overview-lower">
        <article className="panel today-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">YOUR ROUTINE</div><h2>Dose tracking</h2></div>
          </div>
          {next ? (
            <p>Next dose: {next.scheduled_time} {next.drug_name}</p>
          ) : (
            <div className="empty-state compact-empty">
              <div className="empty-icon"><ScheduleRounded /></div>
              <strong>{schedule ? 'No remaining scheduled doses' : 'Generate today’s schedule'}</strong>
              <p>A few daily plans are generated from doses per day and the gap between them. Approve one before marking doses as taken or missed.</p>
              <Button onClick={() => onNavigate('schedule')}>Go to schedule</Button>
            </div>
          )}
        </article>
        <article className="panel next-dose-panel">
          <div className="eyebrow">MEDICATIONS</div>
          <h2>{medications.length ? 'Your list is ready' : 'Start with your medication list'}</h2>
          <p>Catalog names work immediately. Unknown names need a leaflet plus how you take them.</p>
          <Button onClick={() => onNavigate('medications')}>Open medications</Button>
        </article>
      </section>
    </div>
  )
}
