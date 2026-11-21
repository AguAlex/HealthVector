import { useMemo, useState } from 'react'
import { CheckCircleRounded, ScheduleRounded } from '@mui/icons-material'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import type { Medication, SchedulePayload, ScheduleProposal } from '../types'

type Props = {
  schedule: SchedulePayload | null
  medications: Medication[]
  loading: boolean
  onGenerate: () => Promise<void>
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  onTake: (doseId: string) => Promise<void>
  onMiss: (doseId: string) => Promise<void>
  onSelectProposal: (proposalKey: string) => Promise<void>
  onSaveCustom: (doses: { drug_name: string; scheduled_time: string }[]) => Promise<void>
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

function emptyCustomTimes(medications: Medication[]) {
  const next: Record<string, string[]> = {}
  for (const medication of medications) {
    const count = medication.dosing?.doses_per_day || 1
    next[medication.drug_name] = Array.from({ length: count }, () => '08:00')
  }
  return next
}

export default function SchedulePage({
  schedule,
  medications,
  loading,
  onGenerate,
  onApprove,
  onReject,
  onTake,
  onMiss,
  onSelectProposal,
  onSaveCustom,
  onExport,
  onReset,
  onAddMedication,
  working,
}: Props) {
  const record = schedule?.schedule
  const doses = schedule?.doses ?? []
  const proposals = schedule?.proposals ?? []
  const approved = record?.status === 'APPROVED'
  const pending = record?.status === 'PENDING_APPROVAL'
  const blocked = record?.status === 'BLOCKED'
  const dueCount = schedule?.due_count ?? 0
  const taken = doses.filter((dose) => dose.status === 'taken').length
  const [confirmRegenerate, setConfirmRegenerate] = useState(false)
  const [showChooser, setShowChooser] = useState(false)
  const [customTimes, setCustomTimes] = useState<Record<string, string[]>>({})
  const [customError, setCustomError] = useState('')
  const hasSchedule = Boolean(schedule)
  const chooserOpen = pending && proposals.length > 0 && (doses.length === 0 || showChooser)

  const requestGenerate = () => {
    if (hasSchedule) {
      setConfirmRegenerate(true)
      return
    }
    void onGenerate()
  }

  const confirmGenerate = async () => {
    setConfirmRegenerate(false)
    setShowChooser(false)
    await onGenerate()
  }

  const groupedProposal = (proposal: ScheduleProposal) => {
    const groups: Record<string, string[]> = {}
    for (const dose of proposal.doses) {
      groups[dose.drug_name] = [...(groups[dose.drug_name] || []), clockValue(dose.scheduled_time)]
    }
    return groups
  }

  const customDraft = useMemo(() => {
    if (Object.keys(customTimes).length) return customTimes
    return emptyCustomTimes(medications)
  }, [customTimes, medications])

  const saveCustom = async () => {
    setCustomError('')
    const payload: { drug_name: string; scheduled_time: string }[] = []
    for (const medication of medications) {
      const times = customDraft[medication.drug_name] || []
      if (times.some((time) => !time)) {
        setCustomError('Set a clock time for every dose.')
        return
      }
      for (const time of times) payload.push({ drug_name: medication.drug_name, scheduled_time: time })
    }
    try {
      await onSaveCustom(payload)
      setShowChooser(false)
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : 'Those hours do not keep the required gap between doses.')
    }
  }

  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">DOSE TRACKING</div>
          <h1>My schedule</h1>
          <p>Generate 3–4 plans from doses per day and the gap between them. Pick one, or enter your own hours.</p>
        </div>
        <div className="page-title-actions">
          <Button variant="outlined" color="inherit" onClick={() => void onExport()} disabled={!schedule || working}>
            Export
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => void onReset()} disabled={working}>
            Reset
          </Button>
          <Button variant="contained" onClick={requestGenerate} disabled={working}>
            {working ? 'Working…' : hasSchedule ? 'Regenerate' : 'Generate schedule'}
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
          <span>Choose a proposed plan or save custom hours, then approve. Saving is refused until you approve.</span>
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
            <p>Add medications with doses per day and hours between them, then generate a few daily plans to choose from.</p>
            <Button onClick={onAddMedication}>Manage medication list</Button>
          </div>
        </section>
      ) : (
        <>
          <section className="schedule-summary">
            <div className="schedule-summary-icon"><ScheduleRounded /></div>
            <div>
              <strong>{statusLabel(record?.status || '')}</strong>
              <span>
                {doses.length
                  ? `${doses.length} planned dose${doses.length === 1 ? '' : 's'} · ${taken} taken`
                  : `${proposals.length} proposed plan${proposals.length === 1 ? '' : 's'} to review`}
              </span>
            </div>
            <div className="schedule-summary-actions">
              {pending && doses.length > 0 && (
                <>
                  <Button variant="contained" onClick={() => void onApprove()} disabled={working}>Approve</Button>
                  <Button color="inherit" onClick={() => void onReject()} disabled={working}>Reject</Button>
                  {proposals.length > 0 && (
                    <Button color="inherit" onClick={() => setShowChooser(true)} disabled={working}>Change plan</Button>
                  )}
                </>
              )}
              {pending && doses.length === 0 && (
                <Button color="inherit" onClick={() => void onReject()} disabled={working}>Reject</Button>
              )}
              {blocked && (
                <Button color="inherit" onClick={() => void onReject()} disabled={working}>Dismiss blocked plan</Button>
              )}
            </div>
          </section>

          {chooserOpen && (
            <section className="panel schedule-panel">
              <div className="schedule-date-row">
                <div>
                  <div className="eyebrow">OPTIONS</div>
                  <h2>Choose a daily plan</h2>
                  <p>Each option keeps the dose count and the hours between doses. Pick one, or enter custom hours below.</p>
                </div>
              </div>
              <div className="proposal-grid">
                {proposals.map((proposal) => {
                  const groups = groupedProposal(proposal)
                  const selected = record?.selected_proposal === proposal.key
                  return (
                    <article className={`proposal-card${selected ? ' is-selected' : ''}`} key={proposal.key}>
                      <strong>{proposal.label}</strong>
                      <span>{proposal.summary}</span>
                      <ul>
                        {Object.entries(groups).map(([drug, times]) => (
                          <li key={drug}><b>{drug}</b> {times.join(' · ')}</li>
                        ))}
                      </ul>
                      <Button
                        variant={selected ? 'contained' : 'outlined'}
                        onClick={() => void onSelectProposal(proposal.key).then(() => setShowChooser(false))}
                        disabled={working}
                      >
                        {selected ? 'Selected' : 'Use this plan'}
                      </Button>
                    </article>
                  )
                })}
              </div>

              <div className="custom-hours">
                <div className="dose-time-heading">
                  <div>
                    <strong>Custom hours</strong>
                    <span>If none of the plans fit, set your own times. The gap between doses of the same medication is checked.</span>
                  </div>
                </div>
                {medications.map((medication) => {
                  const count = medication.dosing?.doses_per_day || 1
                  const interval = medication.dosing?.interval_hours ?? (count <= 1 ? 24 : 24 / count)
                  const times = customDraft[medication.drug_name] || Array.from({ length: count }, () => '08:00')
                  return (
                    <div className="custom-hours-drug" key={medication.id}>
                      <div>
                        <strong>{medication.drug_name}</strong>
                        <span>{count}× daily · at least {interval}h apart{medication.dosing?.quantity ? ` · ${medication.dosing.quantity}` : ''}</span>
                      </div>
                      <div className="dose-time-list">
                        {times.map((time, index) => (
                          <label className="dose-time-row" key={`${medication.id}-${index}`}>
                            <span>Dose {index + 1}</span>
                            <input
                              type="time"
                              lang="en-US"
                              step={60}
                              value={time}
                              disabled={working}
                              onChange={(event) => {
                                const value = event.target.value
                                setCustomTimes((current) => {
                                  const base = current[medication.drug_name] ? current : customDraft
                                  const next = [...(base[medication.drug_name] || times)]
                                  next[index] = value
                                  return { ...customDraft, ...current, [medication.drug_name]: next }
                                })
                              }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {customError && <p className="form-error" role="alert">{customError}</p>}
                <Button variant="contained" onClick={() => void saveCustom()} disabled={working || medications.length === 0}>
                  Save custom hours
                </Button>
              </div>
            </section>
          )}

          {doses.length > 0 && !chooserOpen && (
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
                    {formatTime12h(dose.scheduled_time)}
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
                        <span>
                          {dose.quantity ? `${dose.quantity} · ` : ''}
                          {dose.due ? 'Time reached' : dose.status === 'scheduled' ? 'Keep the planned gap between doses' : 'Logged dose'}
                        </span>
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
          )}
        </>
      )}

      <Dialog
        open={confirmRegenerate}
        onClose={() => {
          if (!working) setConfirmRegenerate(false)
        }}
        aria-labelledby="regenerate-schedule-title"
        aria-describedby="regenerate-schedule-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="regenerate-schedule-title">Regenerate today’s schedule?</DialogTitle>
        <DialogContent>
          <DialogContentText id="regenerate-schedule-description">
            This replaces the current plan. Taken and missed marks for today will be lost and you will need to pick a proposal again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmRegenerate(false)} disabled={working}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void confirmGenerate()} disabled={working}>
            Regenerate
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
