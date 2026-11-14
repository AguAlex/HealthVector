import { useState } from 'react'
import {
  ArrowBackIosNewRounded,
  ArrowForwardIosRounded,
  CheckCircleRounded,
  ScheduleRounded,
} from '@mui/icons-material'
import { Button, IconButton } from '@mui/material'
import type { TodayDose } from '../types'
import { dateKey, formatTime } from '../utils/schedule'

type Props = {
  doses: TodayDose[]
  selectedDate: Date
  now: Date
  onChangeDate: (date: Date) => void
  onTakeDose: (dose: TodayDose) => void
  onMarkMissed: (dose: TodayDose) => void
  onAddMedication: () => void
}

function isSameDay(first: Date, second: Date): boolean {
  return dateKey(first) === dateKey(second)
}

export default function SchedulePage({
  doses,
  selectedDate,
  now,
  onChangeDate,
  onTakeDose,
  onMarkMissed,
  onAddMedication,
}: Props) {
  const [dayOffset, setDayOffset] = useState(0)
  const changeDay = (offset: number) => {
    const nextOffset = dayOffset + offset
    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + nextOffset)
    setDayOffset(nextOffset)
    onChangeDate(nextDate)
  }
  const allDone = doses.length > 0 && doses.every((dose) => dose.status !== 'scheduled')

  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">A ROUTINE THAT WORKS FOR YOU</div>
          <h1>My schedule</h1>
          <p>Every dose is a small promise to take care of yourself.</p>
        </div>
        <Button variant="contained" onClick={onAddMedication}>Add medication</Button>
      </section>

      <section className="schedule-summary">
        <div className="schedule-summary-icon"><ScheduleRounded /></div>
        <div><strong>{doses.length} dose{doses.length === 1 ? '' : 's'} planned</strong><span>for {new Intl.DateTimeFormat('en', { weekday: 'long' }).format(selectedDate)}</span></div>
        <div className="schedule-summary-progress">
          <div className="mini-progress"><span style={{ width: `${doses.length ? (doses.filter((dose) => dose.status === 'taken').length / doses.length) * 100 : 0}%` }} /></div>
          <span>{doses.filter((dose) => dose.status === 'taken').length} taken</span>
        </div>
      </section>

      <section className="panel schedule-panel">
        <div className="schedule-date-row">
          <div>
            <div className="eyebrow">{isSameDay(selectedDate, now) ? 'TODAY' : dateKey(selectedDate) < dateKey(now) ? 'PAST DAY' : 'UPCOMING'}</div>
            <h2>{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(selectedDate)}</h2>
          </div>
          <div className="date-stepper">
            <IconButton aria-label="Previous day" onClick={() => changeDay(-1)}><ArrowBackIosNewRounded fontSize="small" /></IconButton>
            <IconButton aria-label="Next day" onClick={() => changeDay(1)}><ArrowForwardIosRounded fontSize="small" /></IconButton>
          </div>
        </div>
        {doses.length ? (
          <div className="schedule-list">
            {doses.map((dose, index) => (
              <article className={`schedule-dose status-${dose.status}`} key={dose.key}>
                <div className="schedule-dose-time">{formatTime(dose.time)}</div>
                <div className="schedule-timeline">
                  <span className="timeline-dot" />
                  {index !== doses.length - 1 && <span className="timeline-line" />}
                </div>
                <div className="schedule-dose-card">
                  <div className="schedule-dose-heading">
                    <div className="schedule-dose-icon">{dose.medication.drug_name.slice(0, 1).toUpperCase()}</div>
                    <div className="schedule-dose-name"><strong>{dose.medication.drug_name}</strong><span>{dose.medication.dosage || 'Dose details not added'}</span></div>
                    <span className={`status-chip ${dose.status}`}>{dose.status === 'scheduled' ? 'Upcoming' : dose.status === 'taken' ? 'Taken' : 'Missed'}</span>
                  </div>
                  {(dose.medication.ingredients || dose.medication.notes) && (
                    <div className="schedule-dose-details">
                      {dose.medication.ingredients && <span><b>Active ingredient</b> {dose.medication.ingredients}</span>}
                      {dose.medication.notes && <span><b>Note</b> {dose.medication.notes}</span>}
                    </div>
                  )}
                  {dose.status !== 'taken' && (
                    <div className="schedule-dose-actions">
                      <Button size="small" variant="contained" startIcon={<CheckCircleRounded />} onClick={() => onTakeDose(dose)}>
                        Mark as taken
                      </Button>
                      {dose.status === 'scheduled' && (
                        <Button size="small" color="inherit" onClick={() => onMarkMissed(dose)}>Skip this dose</Button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><ScheduleRounded /></div>
            <strong>No doses on this day</strong>
            <p>Add a medication and set the times that suit your routine.</p>
            <Button onClick={onAddMedication}>Add a medication</Button>
          </div>
        )}
        {allDone && <div className="day-complete"><CheckCircleRounded /> You’ve checked in on every dose today. Well done!</div>}
      </section>
      <p className="schedule-footnote">Your schedule is saved on this device. Always follow the instructions provided by your healthcare professional.</p>
    </div>
  )
}
