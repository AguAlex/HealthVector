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

export default function SchedulePage({
  schedule,
  loading,
  onGenerate,
  onApprove,
  onReject,
  onTake,
  onMiss,
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

  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">DOSE TRACKING</div>
          <h1>My schedule</h1>
          <p>Generate a daily plan from your medication list, then approve it before tracking doses.</p>
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
                  <div className="schedule-dose-time">{dose.scheduled_time}</div>
                  <div className="schedule-timeline">
                    <span className="timeline-dot" />
                    {index < doses.length - 1 && <span className="timeline-line" />}
                  </div>
                  <div className="schedule-dose-card">
                    <div className="schedule-dose-heading">
                      <div className="schedule-dose-icon">{dose.drug_name.slice(0, 2).toUpperCase()}</div>
                      <div className="schedule-dose-name">
                        <strong>{dose.drug_name}</strong>
                        <span>{dose.due ? 'Time reached' : 'Scheduled dose'}</span>
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
