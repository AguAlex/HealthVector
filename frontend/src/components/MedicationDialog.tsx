import { useEffect, useState, type FormEvent } from 'react'
import { CloseRounded } from '@mui/icons-material'
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import { searchMedicationCatalog, type MedicationCatalogOption } from '../utils/rxterms'

const leafletExamples = ['Paracetamol', 'Aspirin', 'Warfarin']

type Props = {
  open: boolean
  onClose: () => void
  onSave: (drugName: string) => Promise<void>
}

export default function MedicationDialog({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('')
  const [catalogOptions, setCatalogOptions] = useState<MedicationCatalogOption[]>([])
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
            : 'Medication catalog is unavailable. You can still enter a name.')
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
    setName('')
    setError('')
    onClose()
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a medication name.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave(name.trim())
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
            <h2>Add a medication</h2>
          </div>
          <IconButton onClick={close} aria-label="Close dialog"><CloseRounded /></IconButton>
        </DialogTitle>
        <DialogContent className="medication-form">
          <aside className="catalog-guide" aria-label="How medication search works">
            <strong>How medication search works</strong>
            <p>
              Suggestions help identify a medication, but it can only be added if its name matches a leaflet in HealthVector.
            </p>
            <div className="catalog-guide-examples">
              <span>Examples in the default leaflet catalog</span>
              <div>
                {leafletExamples.map((example) => (
                  <Button
                    key={example}
                    type="button"
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setName(example)
                      setCatalogOptions([])
                      setCatalogError('')
                      setError('')
                    }}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
            <small>These are catalog examples, not medication recommendations.</small>
          </aside>
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
                setCatalogError('')
                setCatalogLoading(value.trim().length >= 2)
              }
            }}
            onChange={(_, value) => {
              setName(typeof value === 'string' ? value : value?.name.replace(/\s+\([^)]*\)$/, '').trim() ?? '')
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                label="Medication name"
                placeholder="Search or enter a name"
                required
              />
            )}
          />
          {catalogError && <p className="catalog-note catalog-error" role="status">{catalogError}</p>}
          <p className="catalog-note">
            Catalog suggestions help identify names, but the backend only accepts medications with a matching leaflet.
          </p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={close} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : 'Add medication'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
