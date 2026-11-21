import { useState } from 'react'
import { CheckCircleRounded, ScheduleRounded } from '@mui/icons-material'
import { Button } from '@mui/material'
import type { SchedulePayload } from '../types'

type Props = {
  schedule: SchedulePayload | null
  loading: boolean
  onGenerate: () => Promise<void>
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  onTake: (doseId: string) => Promise<void>
  onMiss: (doseId: string) => Promise<void>
  onUpdateTime: (doseId: string, scheduledTime: string) => Promise<void>
  onExport: () => Promise<void>
  onReset: () => Promise<void>
  onAddMedication: () => void
  working: boolean
}

function statusLabel(status: string) {
  if (status === 'PENDING_APPROVAL') return 'Pending approval'
  if (status === 'BLOCKED') return 'Blocked'
  if (status === 'APPROVED') return 'Approved'
  return status
}

function clockValue(value: string) {
  return value.slice(0, 5)
}

function formatTime12h(value: string) {
  const [hourPart, minutePart] = clockValue(value).split(':')
  const hour = Number(hourPart)
  const minute = Number(minutePart)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export default function SchedulePage({
  schedule,
  loading,
  onGenerate,
  onApprove,
  onReject,
  onTake,
  onMiss,
  onUpdateTime,
  onExport,
  onReset,
  onAddMedication,
  working,
}: Props) {
  const record = schedule?.schedule
  const doses = schedule?.doses ?? []
  const approved = record?.status === 'APPROVED'
  const pending = record?.status === 'PENDING_APPROVAL'
  const blocked = record?.status === 'BLOCKED'
  const dueCount = schedule?.due_count ?? 0
  const taken = doses.filter((dose) => dose.status === 'taken').length
  const [draftTimes, setDraftTimes] = useState<Record<string, string>>({})

  const displayTime = (doseId: string, scheduledTime: string) => draftTimes[doseId] ?? clockValue(scheduledTime)

  const commitTime = async (doseId: string, original: string) => {
    const next = clockValue(draftTimes[doseId] ?? original)
    if (next === clockValue(original)) {
      setDraftTimes((current) => {
        const copy = { ...current }
        delete copy[doseId]
        return copy
      })
      return
    }
    await onUpdateTime(doseId, next)
    setDraftTimes((current) => {
      const copy = { ...current }
      delete copy[doseId]
      return copy
    })
  }

  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">DOSE TRACKING</div>
          <h1>My schedule</h1>
          <p>Generate a daily plan, move a dose time if needed, then approve it before tracking doses.</p>
        </div>
        <div className="page-title-actions">
          <Button variant="outlined" color="inherit" onClick={() => void onExport()} disabled={!schedule || working}>
            Export
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => void onReset()} disabled={working}>
            Reset
          </Button>
          <Button variant="contained" onClick={() => void onGenerate()} disabled={working}>
            {working ? 'Working…' : 'Generate schedule'}
          </Button>
        </div>
      </section>

      {record?.status === 'BLOCKED' && (
        <div className="inline-notice error-notice" role="alert">
          <strong>Schedule blocked</strong>
          <span>{record.blocked_reason} This plan cannot be approved in the application.</span>
        </div>
      )}
      {pending && (
        <div className="inline-notice warning-notice" role="status">
          <strong>Approval required</strong>
          <span>This is a proposal only. Save is refused until you approve it.</span>
        </div>
      )}
      {dueCount > 0 && approved && (
        <div className="inline-notice warning-notice dose-alert" role="alert">
          <strong>Dose time reached</strong>
          <span>{dueCount} dose{dueCount === 1 ? '' : 's'} should be marked taken or missed.</span>
        </div>
      )}
      {schedule?.interaction?.has_interaction && !blocked && (
        <div className="inline-notice warning-notice" role="status">
          <strong>Interaction notice</strong>
          <span>{schedule.interaction.warning_message}</span>
        </div>
      )}

      {loading ? (
        <section className="panel schedule-panel">Loading today’s schedule…</section>
      ) : !schedule ? (
        <section className="panel schedule-panel">
          <div className="empty-state">
            <div className="empty-icon"><ScheduleRounded /></div>
            <strong>No schedule for today</strong>
            <p>Add medications with indexed leaflets, then generate a daily timeline (for example 08:00).</p>
            <Button onClick={onAddMedication}>Manage medication list</Button>
          </div>
        </section>
      ) : (
        <>
          <section className="schedule-summary">
            <div className="schedule-summary-icon"><ScheduleRounded /></div>
            <div>
              <strong>{statusLabel(record?.status || '')}</strong>
              <span>{doses.length} planned dose{doses.length === 1 ? '' : 's'} · {taken} taken</span>
            </div>
            <div className="schedule-summary-actions">
              {pending && (
                <>
                  <Button variant="contained" onClick={() => void onApprove()} disabled={working}>Approve</Button>
                  <Button color="inherit" onClick={() => void onReject()} disabled={working}>Reject</Button>
                </>
              )}
              {blocked && (
                <Button color="inherit" onClick={() => void onReject()} disabled={working}>Dismiss blocked plan</Button>
              )}
            </div>
          </section>

          <section className="panel schedule-panel">
            <div className="schedule-date-row">
              <div>
                <div className="eyebrow">TODAY</div>
                <h2>{record?.date}</h2>
              </div>
            </div>
            <div className="schedule-list">
              {doses.map((dose, index) => (
                <article className={`schedule-dose status-${dose.status}${dose.due ? ' is-due' : ''}`} key={dose.id}>
                  <div className="schedule-dose-time">
                    {dose.status === 'scheduled' ? (
                      <div className="schedule-time-edit">
                        <span className="schedule-time-ampm">{formatTime12h(displayTime(dose.id, dose.scheduled_time))}</span>
                        <label>
                          <span className="visually-hidden">Change time for {dose.drug_name}</span>
                          <input
                            type="time"
                            lang="en-US"
                            step={60}
                            value={displayTime(dose.id, dose.scheduled_time)}
                            disabled={working}
                            onChange={(event) => {
                              const value = event.target.value
                              setDraftTimes((current) => ({ ...current, [dose.id]: value }))
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void commitTime(dose.id, dose.scheduled_time)
                              }
                            }}
                          />
                        </label>
                        {displayTime(dose.id, dose.scheduled_time) !== clockValue(dose.scheduled_time) && (
                          <Button
                            size="small"
                            variant="text"
                            disabled={working}
                            onClick={() => void commitTime(dose.id, dose.scheduled_time)}
                          >
                            Save
                          </Button>
                        )}
                      </div>
                    ) : (
                      formatTime12h(dose.scheduled_time)
                    )}
                  </div>
                  <div className="schedule-timeline">
                    <span className="timeline-dot" />
                    {index < doses.length - 1 && <span className="timeline-line" />}
                  </div>
                  <div className="schedule-dose-card">
                    <div className="schedule-dose-heading">
                      <div className="schedule-dose-icon">{dose.drug_name.slice(0, 2).toUpperCase()}</div>
                      <div className="schedule-dose-name">
                        <strong>{dose.drug_name}</strong>
                        <span>{dose.due ? 'Time reached' : dose.status === 'scheduled' ? 'Tap the time to move this dose' : 'Logged dose'}</span>
                      </div>
                      <span className={`status-chip ${dose.status}`}>{dose.status}</span>
                    </div>
                    {approved && dose.status === 'scheduled' && (
                      <div className="schedule-dose-actions">
                        <Button variant="contained" onClick={() => void onTake(dose.id)} disabled={working}>Take</Button>
                        <Button color="inherit" onClick={() => void onMiss(dose.id)} disabled={working}>Miss</Button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {approved && doses.length > 0 && doses.every((dose) => dose.status !== 'scheduled') && (
              <div className="day-complete"><CheckCircleRounded /> All tracked doses are logged.</div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
