import { useEffect, useState } from 'react'
import { AddRounded, CloseRounded, DeleteOutlineRounded } from '@mui/icons-material'
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import type { Medication } from '../types'
import { searchMedicationCatalog, type MedicationCatalogOption } from '../utils/rxterms'

type Props = {
  open: boolean
  medication?: Medication
  onClose: () => void
  onSave: (medication: Omit<Medication, 'id'>) => Promise<void>
}

export default function MedicationDialog({ open, medication, onClose, onSave }: Props) {
  const [name, setName] = useState(() => medication?.drug_name ?? '')
  const [dosage, setDosage] = useState(() => medication?.dosage ?? '')
  const [ingredients, setIngredients] = useState(() => medication?.ingredients ?? '')
  const [notes, setNotes] = useState(() => medication?.notes ?? '')
  const [times, setTimes] = useState(() => medication?.times.length ? medication.times : ['08:00'])
  const [catalogOptions, setCatalogOptions] = useState<MedicationCatalogOption[]>([])
  const [strengthOptions, setStrengthOptions] = useState<string[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const term = name.trim()
    if (term.length < 2) return

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      void searchMedicationCatalog(term, controller.signal)
        .then(setCatalogOptions)
        .catch((lookupError: unknown) => {
          if (controller.signal.aborted) return
          setCatalogError(lookupError instanceof Error
            ? lookupError.message
            : 'Medication catalog is unavailable. You can still enter details manually.')
          setCatalogOptions([])
        })
        .finally(() => {
          if (!controller.signal.aborted) setCatalogLoading(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [name])

  const close = () => {
    onClose()
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || !dosage.trim()) {
      setError('Add the medication name and dosage to continue.')
      return
    }
    if (times.some((time) => !time)) {
      setError('Choose a time for every scheduled dose.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        drug_name: name.trim(),
        dosage: dosage.trim(),
        ingredients: ingredients.trim(),
        notes: notes.trim(),
        times: [...times].sort(),
      })
      close()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this medication.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle className="dialog-heading">
          <div>
            <span className="eyebrow">YOUR MEDICATIONS</span>
            <h2>{medication ? 'Edit medication' : 'Add a medication'}</h2>
          </div>
          <IconButton onClick={close} aria-label="Close dialog"><CloseRounded /></IconButton>
        </DialogTitle>
        <DialogContent className="medication-form">
          <Autocomplete<MedicationCatalogOption, false, false, true>
            freeSolo
            autoSelect={false}
            options={catalogOptions}
            loading={catalogLoading}
            value={name}
            inputValue={name}
            getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
            onInputChange={(_, value, reason) => {
              setName(value)
              if (reason === 'input' || reason === 'clear') {
                setCatalogOptions([])
                setStrengthOptions([])
                setCatalogError('')
                setCatalogLoading(value.trim().length >= 2)
              }
            }}
            onChange={(_, value) => {
              if (value && typeof value !== 'string') {
                setName(value.name.replace(/\s+\([^)]*\)$/, '').trim())
                setStrengthOptions(value.strengths)
              } else if (typeof value === 'string') {
                setName(value)
                setStrengthOptions([])
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                label="Medication name"
                placeholder="Search a name or enter it manually"
                disabled={Boolean(medication)}
                required
              />
            )}
          />
          {catalogError && <p className="catalog-note catalog-error" role="status">{catalogError}</p>}
          <div className="form-two-columns">
            <Autocomplete<string, false, false, true>
              freeSolo
              options={strengthOptions}
              value={dosage}
              inputValue={dosage}
              onInputChange={(_, value) => setDosage(value)}
              onChange={(_, value) => {
                if (typeof value === 'string') setDosage(value)
              }}
              renderInput={(params) => (
                <TextField {...params} label="Dose" placeholder="e.g. 1 tablet" required />
              )}
            />
            <TextField
              label="Active ingredient(s)"
              placeholder="e.g. cholecalciferol"
              value={ingredients}
              onChange={(event) => setIngredients(event.target.value)}
              fullWidth
            />
          </div>
          <p className="catalog-note">
            {strengthOptions.length
              ? 'Strengths and forms are catalog options. Choose the dose prescribed to you.'
              : 'Search suggestions use the free NIH RxTerms catalog. Confirm dose details against your prescription.'}
          </p>
          <div className="dose-time-heading">
            <div><strong>Reminder times</strong><span>Set the times you usually take it</span></div>
            <Button
              size="small"
              startIcon={<AddRounded />}
              onClick={() => setTimes((current) => [...current, '12:00'])}
            >
              Add time
            </Button>
          </div>
          <div className="dose-time-list">
            {times.map((time, index) => (
              <div className="dose-time-row" key={`time-${index}`}>
                <TextField
                  type="time"
                  label={`Dose ${index + 1}`}
                  value={time}
                  onChange={(event) => setTimes((current) => current.map((item, i) => i === index ? event.target.value : item))}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
                {times.length > 1 && (
                  <IconButton onClick={() => setTimes((current) => current.filter((_, i) => i !== index))} aria-label="Remove dose time">
                    <DeleteOutlineRounded />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
          <TextField
            label="Notes"
            placeholder="Instructions or reminders"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          {error && <p className="form-error" role="alert">{error}</p>}
        </DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={close} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : medication ? 'Save changes' : 'Add medication'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
