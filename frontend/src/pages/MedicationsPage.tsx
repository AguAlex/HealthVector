import { useState } from 'react'
import {
  AddRounded,
  DeleteOutlineRounded,
  EditOutlined,
  MedicationOutlined,
  MoreHorizRounded,
  ScienceOutlined,
} from '@mui/icons-material'
import { Button, IconButton } from '@mui/material'
import type { Medication } from '../types'
import MedicationDialog from '../components/MedicationDialog'
import { formatTime } from '../utils/schedule'

type Props = {
  medications: Medication[]
  onSave: (medication: Omit<Medication, 'id'>, id?: string) => Promise<void>
  onRemove: (medication: Medication) => void
  onCheckInteractions: () => void
  interactionWarning: string
  checkingInteractions: boolean
}

export default function MedicationsPage({
  medications,
  onSave,
  onRemove,
  onCheckInteractions,
  interactionWarning,
  checkingInteractions,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Medication>()

  const openNew = () => {
    setEditing(undefined)
    setDialogOpen(true)
  }

  const openEdit = (medication: Medication) => {
    setEditing(medication)
    setDialogOpen(true)
  }

  const save = async (medication: Omit<Medication, 'id'>) => {
    await onSave(medication, editing?.id)
  }

  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">YOUR PERSONAL MEDICATION LIST</div>
          <h1>Medications</h1>
          <p>Keep your routine and the details that matter in one place.</p>
        </div>
        <Button variant="contained" startIcon={<AddRounded />} onClick={openNew}>Add medication</Button>
      </section>

      {interactionWarning && <div className="inline-notice warning-notice"><strong>Interaction notice</strong><span>{interactionWarning}</span></div>}

      <section className="medications-toolbar">
        <div><strong>{medications.length} active</strong><span> medication{medications.length === 1 ? '' : 's'} in your plan</span></div>
        {medications.length > 1 && (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ScienceOutlined />}
            onClick={onCheckInteractions}
            disabled={checkingInteractions}
          >
            {checkingInteractions ? 'Checking...' : 'Check interactions'}
          </Button>
        )}
      </section>

      {medications.length ? (
        <section className="medication-grid">
          {medications.map((medication, index) => (
            <article className="medication-card" key={medication.id}>
              <div className={`medication-card-top tone-${index % 4}`}>
                <div className="medication-pictogram"><MedicationOutlined /></div>
                <IconButton
                  aria-label={`More options for ${medication.drug_name}`}
                  onClick={() => openEdit(medication)}
                  size="small"
                >
                  <MoreHorizRounded />
                </IconButton>
              </div>
              <div className="medication-card-content">
                <span className="eyebrow">MEDICATION</span>
                <h2>{medication.drug_name}</h2>
                <div className="medication-dosage">{medication.dosage || 'Add dose details'}</div>
                {medication.ingredients && (
                  <div className="medication-ingredient"><ScienceOutlined /><span>{medication.ingredients}</span></div>
                )}
                {medication.notes && <p className="medication-notes">{medication.notes}</p>}
                <div className="medication-card-footer">
                  <div className="medication-times">
                    {medication.times.length ? medication.times.map((time) => (
                      <span key={time}>{formatTime(time)}</span>
                    )) : <span>No reminders set</span>}
                  </div>
                  <div className="medication-card-actions">
                    <IconButton aria-label={`Edit ${medication.drug_name}`} onClick={() => openEdit(medication)} size="small"><EditOutlined /></IconButton>
                    <IconButton aria-label={`Remove ${medication.drug_name}`} onClick={() => onRemove(medication)} size="small"><DeleteOutlineRounded /></IconButton>
                  </div>
                </div>
              </div>
            </article>
          ))}
          <button className="add-medication-card" onClick={openNew}>
            <span className="add-medication-circle"><AddRounded /></span>
            <strong>Add another medication</strong>
            <span>Build a routine that feels right</span>
          </button>
        </section>
      ) : (
        <section className="panel medication-empty-panel">
          <div className="empty-state">
            <div className="empty-icon"><MedicationOutlined /></div>
            <strong>Your medication list is a blank slate</strong>
            <p>Add the medicines and supplements you take, then set the times that work for you.</p>
            <Button variant="contained" startIcon={<AddRounded />} onClick={openNew}>Add your first medication</Button>
          </div>
        </section>
      )}
      <div className="medical-disclaimer">
        <span>ⓘ</span> Keep medication details accurate and follow the directions on your prescription or package.
      </div>
      <MedicationDialog
        key={`${dialogOpen}-${editing?.id ?? 'new'}`}
        open={dialogOpen}
        medication={editing}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
    </div>
  )
}
