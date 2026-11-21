import { useEffect, useState, type FormEvent } from 'react'
import { CloseRounded } from '@mui/icons-material'
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField } from '@mui/material'
import type { CustomLeafletInput } from '../types'
import { searchMedicationCatalog, type MedicationCatalogOption } from '../utils/rxterms'

const leafletExamples = [
  'Paracetamol',
  'Aspirin',
  'Warfarin',
  'Ibuprofen',
  'Simvastatin',
  'Clarithromycin',
  'Fluoxetine',
  'Sertraline',
  'Digoxin',
  'Lisinopril',
  'Spironolactone',
  'Potassium chloride',
  'Methotrexate',
  'Ciprofloxacin',
  'Amiodarone',
  'Lithium',
]

type Mode = 'catalog' | 'custom'

type Props = {
  open: boolean
  initialMode?: Mode
  onClose: () => void
  onSave: (drugName: string) => Promise<void>
  onSaveCustom: (input: CustomLeafletInput) => Promise<void>
}

export default function MedicationDialog({
  open,
  initialMode = 'catalog',
  onClose,
  onSave,
  onSaveCustom,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [leafletText, setLeafletText] = useState('')
  const [posology, setPosology] = useState('')
  const [sideEffects, setSideEffects] = useState('')
  const [interactions, setInteractions] = useState('')
  const [catalogOptions, setCatalogOptions] = useState<MedicationCatalogOption[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [initialMode, open])

  useEffect(() => {
    const term = name.trim()
    if (mode !== 'catalog' || term.length < 2) return

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
  }, [mode, name])

  const reset = () => {
    setName('')
    setLeafletText('')
    setPosology('')
    setSideEffects('')
    setInteractions('')
    setCatalogOptions([])
    setCatalogError('')
    setError('')
    setMode(initialMode)
  }

  const close = () => {
    reset()
    onClose()
  }

  const switchToCustom = () => {
    setMode('custom')
    setError('')
    setCatalogError('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Enter a medication name.')
      return
    }
    if (mode === 'custom' && leafletText.trim().length < 20) {
      setError('Paste at least a short leaflet excerpt (20 characters or more).')
      return
    }

    setSaving(true)
    setError('')
    try {
      if (mode === 'custom') {
        await onSaveCustom({
          drug_name: name.trim(),
          leaflet_text: leafletText.trim(),
          posology: posology.trim() || undefined,
          side_effects: sideEffects.trim() || undefined,
          interactions: interactions.trim() || undefined,
        })
      } else {
        await onSave(name.trim())
      }
      close()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Unable to save this medication.'
      if (mode === 'catalog' && message === 'Not found in database') {
        setMode('custom')
        setError('This name is not in the leaflet catalog. Add your own leaflet to continue.')
      } else {
        setError(message)
      }
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
            <h2>{mode === 'custom' ? 'Add with your leaflet' : 'Add a medication'}</h2>
          </div>
          <IconButton onClick={close} aria-label="Close dialog"><CloseRounded /></IconButton>
        </DialogTitle>
        <DialogContent className="medication-form">
          <div className="dialog-mode-toggle" role="tablist" aria-label="How to add a medication">
            <Button
              type="button"
              role="tab"
              aria-selected={mode === 'catalog'}
              variant={mode === 'catalog' ? 'contained' : 'outlined'}
              color={mode === 'catalog' ? 'primary' : 'inherit'}
              onClick={() => {
                setMode('catalog')
                setError('')
              }}
            >
              Catalog name
            </Button>
            <Button
              type="button"
              role="tab"
              aria-selected={mode === 'custom'}
              variant={mode === 'custom' ? 'contained' : 'outlined'}
              color={mode === 'custom' ? 'primary' : 'inherit'}
              onClick={switchToCustom}
            >
              My leaflet
            </Button>
          </div>

          {mode === 'catalog' ? (
            <>
              <aside className="catalog-guide" aria-label="How medication search works">
                <strong>How medication search works</strong>
                <p>
                  Add a name from the HealthVector leaflet catalog, or switch to My leaflet to paste your own prospect.
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
            </>
          ) : (
            <>
              <aside className="catalog-guide" aria-label="How a custom leaflet is used">
                <strong>Your leaflet becomes the source of truth</strong>
                <p>
                  Paste the official package leaflet. The assistant and schedule use this text for your medication only.
                  This does not replace professional medical advice.
                </p>
              </aside>
              <TextField
                autoFocus
                label="Medication name"
                placeholder="As written on the box"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              <TextField
                label="Leaflet text"
                placeholder="Paste posology, interactions, and side effects from the official leaflet"
                value={leafletText}
                onChange={(event) => setLeafletText(event.target.value)}
                required
                multiline
                minRows={6}
              />
              <TextField
                label="Posology (section 4.2, optional)"
                placeholder="For example: once daily in the evening"
                value={posology}
                onChange={(event) => setPosology(event.target.value)}
                multiline
                minRows={2}
              />
              <TextField
                label="Side effects (section 4.8, optional)"
                value={sideEffects}
                onChange={(event) => setSideEffects(event.target.value)}
                multiline
                minRows={2}
              />
              <TextField
                label="Interactions (section 4.5, optional)"
                value={interactions}
                onChange={(event) => setInteractions(event.target.value)}
                multiline
                minRows={2}
              />
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
        </DialogContent>
        <DialogActions className="dialog-actions">
          <Button onClick={close} color="inherit">Cancel</Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? 'Saving...' : mode === 'custom' ? 'Save leaflet and add' : 'Add medication'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
