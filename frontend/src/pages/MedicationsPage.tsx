import { useState } from 'react'
import {
  AddRounded,
  DeleteOutlineRounded,
  MedicationOutlined,
  ScienceOutlined,
} from '@mui/icons-material'
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton } from '@mui/material'
import type { CustomLeafletInput, Medication } from '../types'
import MedicationDialog from '../components/MedicationDialog'

type Props = {
  medications: Medication[]
  onSave: (drugName: string) => Promise<void>
  onSaveCustom: (input: CustomLeafletInput) => Promise<void>
  onRemove: (medication: Medication) => Promise<void>
  onCheckInteractions: () => void
  onReset: () => Promise<void>
  interactionWarning: string
  checkingInteractions: boolean
}

export default function MedicationsPage({
  medications,
  onSave,
  onSaveCustom,
  onRemove,
  onCheckInteractions,
  onReset,
  interactionWarning,
  checkingInteractions,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'catalog' | 'custom'>('catalog')
  const [removalTarget, setRemovalTarget] = useState<Medication>()
  const [removalError, setRemovalError] = useState('')
  const [removing, setRemoving] = useState(false)
  const [expandedId, setExpandedId] = useState<string>()

  const openNew = (mode: 'catalog' | 'custom' = 'catalog') => {
    setDialogMode(mode)
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
          <p>Add a catalog name, or paste your own leaflet if the medication is not in the database.</p>
        </div>
        <div className="page-title-actions">
          <Button color="inherit" onClick={() => void onReset()}>Reset</Button>
          <Button color="inherit" variant="outlined" onClick={() => openNew('custom')}>Add with leaflet</Button>
          <Button variant="contained" startIcon={<AddRounded />} onClick={() => openNew('catalog')}>Add medication</Button>
        </div>
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
                <button
                  className="side-effects-toggle"
                  onClick={() => setExpandedId((current) => current === medication.id ? undefined : medication.id)}
                >
                  {expandedId === medication.id ? 'Hide side effects' : 'Show side effects'}
                </button>
                {expandedId === medication.id && (
                  <p className="side-effects-text">
                    {medication.side_effects || 'No §4.8 side-effect section is stored for this leaflet.'}
                  </p>
                )}
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
          <button className="add-medication-card" onClick={() => openNew('catalog')}>
            <span className="add-medication-circle"><AddRounded /></span>
            <strong>Add another medication</strong>
            <span>From the catalog, or with your own leaflet</span>
          </button>
        </section>
      ) : (
        <section className="panel medication-empty-panel">
          <div className="empty-state">
            <div className="empty-icon"><MedicationOutlined /></div>
            <strong>Your medication list is a blank slate</strong>
            <p>Add a catalog medication, or paste your own official leaflet to register a new name.</p>
            <div className="empty-actions">
              <Button variant="contained" startIcon={<AddRounded />} onClick={() => openNew('catalog')}>Add your first medication</Button>
              <Button color="inherit" onClick={() => openNew('custom')}>Add with leaflet</Button>
            </div>
          </div>
        </section>
      )}
      <div className="medical-disclaimer">
        <span>ⓘ</span> Follow your prescription or package directions.
      </div>
      <MedicationDialog
        key={`${dialogOpen}-${dialogMode}`}
        open={dialogOpen}
        initialMode={dialogMode}
        onClose={() => setDialogOpen(false)}
        onSave={save}
        onSaveCustom={onSaveCustom}
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
