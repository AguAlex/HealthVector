import { useState } from 'react'
import {
  AddRounded,
  DeleteOutlineRounded,
  MedicationOutlined,
  ScienceOutlined,
} from '@mui/icons-material'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material'
import type { Medication } from '../types'
import MedicationDialog from '../components/MedicationDialog'

type Props = {
  medications: Medication[]
  onSave: (drugName: string) => Promise<void>
  onRemove: (medication: Medication) => Promise<void>
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
  const [removalTarget, setRemovalTarget] = useState<Medication>()
  const [removalError, setRemovalError] = useState('')
  const [removing, setRemoving] = useState(false)

  const openNew = () => {
    setDialogOpen(true)
  }

  const save = async (drugName: string) => {
    await onSave(drugName)
  }

  const confirmRemoval = async () => {
    if (!removalTarget || removing) return
    setRemoving(true)
    setRemovalError('')
    try {
      await onRemove(removalTarget)
      setRemovalTarget(undefined)
    } catch (error) {
      setRemovalError(error instanceof Error ? error.message : 'Unable to remove this medication.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="page-content">
      <section className="page-title-row">
        <div>
          <div className="eyebrow">YOUR PERSONAL MEDICATION LIST</div>
          <h1>Medications</h1>
          <p>View and remove medications saved in your account.</p>
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
              </div>
              <div className="medication-card-content">
                <span className="eyebrow">MEDICATION</span>
                <h2>{medication.drug_name}</h2>
                <div className="medication-card-footer">
                  <div className="medication-card-actions">
                    <IconButton
                      aria-label={`Remove ${medication.drug_name}`}
                      onClick={() => {
                        setRemovalTarget(medication)
                        setRemovalError('')
                      }}
                      size="small"
                    >
                      <DeleteOutlineRounded />
                    </IconButton>
                  </div>
                </div>
              </div>
            </article>
          ))}
          <button className="add-medication-card" onClick={openNew}>
            <span className="add-medication-circle"><AddRounded /></span>
            <strong>Add another medication</strong>
            <span>Add a name recognized by the backend</span>
          </button>
        </section>
      ) : (
        <section className="panel medication-empty-panel">
          <div className="empty-state">
            <div className="empty-icon"><MedicationOutlined /></div>
            <strong>Your medication list is a blank slate</strong>
            <p>Add medication names that have a matching leaflet in the backend.</p>
            <Button variant="contained" startIcon={<AddRounded />} onClick={openNew}>Add your first medication</Button>
          </div>
        </section>
      )}
      <div className="medical-disclaimer">
        <span>ⓘ</span> The current backend stores medication names only. Follow your prescription or package directions.
      </div>
      <MedicationDialog
        key={String(dialogOpen)}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
      <Dialog
        open={Boolean(removalTarget)}
        onClose={() => {
          if (!removing) setRemovalTarget(undefined)
        }}
        aria-labelledby="remove-medication-title"
        aria-describedby="remove-medication-description"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="remove-medication-title">Remove medication?</DialogTitle>
        <DialogContent>
          <DialogContentText id="remove-medication-description">
            Remove {removalTarget?.drug_name} from your medication list? This action cannot be undone.
          </DialogContentText>
          {removalError && <p className="form-error" role="alert">{removalError}</p>}
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => setRemovalTarget(undefined)}
            disabled={removing}
          >
            Cancel
          </Button>
          <Button
            color="error"
            onClick={() => void confirmRemoval()}
            disabled={removing}
          >
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
