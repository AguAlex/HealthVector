import { ScheduleRounded } from '@mui/icons-material'
import { Button } from '@mui/material'

type Props = {
  onAddMedication: () => void
}

export default function SchedulePage({ onAddMedication }: Props) {
  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">DOSE TRACKING</div>
          <h1>My schedule</h1>
          <p>Reminder times and dose statuses are not available with the current backend.</p>
        </div>
        <Button variant="contained" disabled>Schedule setup unavailable</Button>
      </section>

      <section className="panel schedule-panel">
        <div className="empty-state">
          <div className="empty-icon"><ScheduleRounded /></div>
          <strong>Schedule support requires backend changes</strong>
          <p>
            The current medication API does not store reminder times or taken/missed statuses.
            These features are disabled until the backend contract is updated.
          </p>
          <Button onClick={onAddMedication}>Manage medication list</Button>
        </div>
      </section>
      <p className="schedule-footnote">
        Follow the instructions provided by your healthcare professional.
      </p>
    </div>
  )
}
