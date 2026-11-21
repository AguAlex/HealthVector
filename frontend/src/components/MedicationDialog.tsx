import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CloseRounded } from '@mui/icons-material'
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField } from '@mui/material'
import type { CustomLeafletInput, LeafletCatalogItem, MedicationDosing } from '../types'

type Mode = 'catalog' | 'custom'

function defaultInterval(dosesPerDay: number) {
  if (dosesPerDay <= 1) return 24
  return Number((24 / dosesPerDay).toFixed(2))
}

type Props = {
  open: boolean
  initialMode?: Mode
  catalog: LeafletCatalogItem[]
  onClose: () => void
  onSave: (drugName: string, dosing?: MedicationDosing) => Promise<void>
  onSaveCustom: (input: CustomLeafletInput) => Promise<void>
}

export default function MedicationDialog({
  open,
  initialMode = 'catalog',
  catalog,
  onClose,
  onSave,
  onSaveCustom,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [leafletText, setLeafletText] = useState('')
  const [dosesPerDay, setDosesPerDay] = useState(1)
  const [intervalHours, setIntervalHours] = useState(24)
  const [quantity, setQuantity] = useState('')
  const [sideEffects, setSideEffects] = useState('')
  const [interactions, setInteractions] = useState('')
  const [intervalTouched, setIntervalTouched] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [initialMode, open])

  const examples = useMemo(
    () => catalog.filter((item) => item.is_default).map((item) => item.drug_name).slice(0, 16),
    [catalog],
  )

  const applyCatalogSuggestion = (item: LeafletCatalogItem | undefined) => {
    if (!item) return
    const count = item.suggested_doses_per_day || 1
    setDosesPerDay(count)
    setIntervalHours(item.suggested_interval_hours ?? defaultInterval(count))
    setIntervalTouched(false)
    if (item.suggested_quantity) setQuantity(item.suggested_quantity)
  }

  const catalogMatch = useMemo(() => {
    const query = name.trim().toLowerCase()
    if (!query) return undefined
    return catalog.find((item) => item.drug_name.toLowerCase() === query)
  }, [catalog, name])

  const reset = () => {
    setName('')
    setLeafletText('')
    setDosesPerDay(1)
    setIntervalHours(24)
    setQuantity('')
    setSideEffects('')
    setInteractions('')
    setIntervalTouched(false)
    setError('')
    setMode(initialMode)
  }

  const close = () => {
    reset()
    onClose()
  }

  const changeDoseCount = (count: number) => {
    setDosesPerDay(count)
    if (count === 1) {
      setIntervalHours(24)
      return
    }
    if (!intervalTouched) setIntervalHours(defaultInterval(count))
  }

  const dosingPayload = (): MedicationDosing => ({
    doses_per_day: dosesPerDay,
    interval_hours: dosesPerDay === 1 ? 24 : intervalHours,
    quantity: quantity.trim() || undefined,
  })

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
    if (dosesPerDay > 1 && intervalHours * (dosesPerDay - 1) >= 24) {
      setError('That interval is too long to fit this many doses in one day.')
      return
    }

    setSaving(true)
    setError('')
    const dosing = dosingPayload()
    try {
      if (mode === 'custom') {
        await onSaveCustom({
          drug_name: name.trim(),
          leaflet_text: leafletText.trim(),
          dosing,
          side_effects: sideEffects.trim() || undefined,
          interactions: interactions.trim() || undefined,
        })
      } else {
        await onSave(name.trim(), dosing)
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
              onClick={() => {
                setMode('custom')
                setError('')
              }}
            >
              My leaflet
            </Button>
          </div>

          {mode === 'catalog' ? (
            <>
              <aside className="catalog-guide" aria-label="How medication search works">
                <strong>Search the HealthVector leaflet database</strong>
                <p>
                  Set how many times a day you take it and the hours between doses. Clock times are chosen when you generate a schedule.
                </p>
                {examples.length > 0 && (
                  <div className="catalog-guide-examples">
                    <span>Names currently in the catalog</span>
                    <div>
                      {examples.map((example) => (
                        <Button
                          key={example}
                          type="button"
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setName(example)
                            setError('')
                            applyCatalogSuggestion(catalog.find((item) => item.drug_name === example))
                          }}
                        >
                          {example}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <small>These are database names, not medication recommendations.</small>
              </aside>
              <Autocomplete<LeafletCatalogItem, false, false, true>
                freeSolo
                autoSelect={false}
                options={catalog}
                filterOptions={(options, state) => {
                  const query = state.inputValue.trim().toLowerCase()
                  if (!query) return options
                  return options.filter((option) => option.drug_name.toLowerCase().includes(query))
                }}
                value={name}
                inputValue={name}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.drug_name}
                groupBy={(option) => option.is_default ? 'HealthVector catalog' : 'Your leaflets'}
                onInputChange={(_, value) => setName(value)}
                onChange={(_, value) => {
                  if (typeof value === 'string') {
                    setName(value)
                    return
                  }
                  setName(value?.drug_name ?? '')
                  applyCatalogSuggestion(value ?? undefined)
                }}
                noOptionsText="No matching leaflet. Use My leaflet to add one."
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    label="Medication name"
                    placeholder="Search the leaflet database"
                    required
                  />
                )}
              />
            </>
          ) : (
            <>
              <aside className="catalog-guide" aria-label="How a custom leaflet is used">
                <strong>Leaflet for answers, interval for the schedule</strong>
                <p>
                  Paste the official package leaflet for the assistant. The daily timeline uses doses per day and the gap between them, not fixed clock times.
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
                label="Official leaflet text"
                placeholder="Paste the package leaflet. This is the source for questions and citations."
                value={leafletText}
                onChange={(event) => setLeafletText(event.target.value)}
                required
                multiline
                minRows={6}
              />
              <TextField
                label="Side effects (optional)"
                placeholder="Copy the side-effect list if you want it on the medication card"
                value={sideEffects}
                onChange={(event) => setSideEffects(event.target.value)}
                multiline
                minRows={2}
              />
              <TextField
                label="Interactions (optional)"
                placeholder="Copy interaction warnings if they are listed"
                value={interactions}
                onChange={(event) => setInteractions(event.target.value)}
                multiline
                minRows={2}
              />
            </>
          )}

          <div className="dosing-block">
            <div className="dose-time-heading">
              <div>
                <strong>How you take it</strong>
                <span>
                  {mode === 'catalog' && catalogMatch
                    ? 'Suggested from the leaflet. One daily dose uses a 24-hour gap.'
                    : 'No clock times here. The generator will propose 3–4 daily plans from this interval.'}
                </span>
              </div>
            </div>
            <div className="form-two-columns">
              <TextField
                select
                label="Doses per day"
                value={dosesPerDay}
                onChange={(event) => changeDoseCount(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((count) => (
                  <MenuItem key={count} value={count}>{count}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Amount per dose"
                placeholder="1 tablet or 500 mg"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <TextField
              type="number"
              label="Hours between doses"
              value={dosesPerDay === 1 ? 24 : intervalHours}
              disabled={dosesPerDay === 1}
              slotProps={{ htmlInput: { min: 1, max: 24, step: 0.5 } }}
              helperText={dosesPerDay === 1 ? 'One dose defaults to every 24 hours.' : 'Minimum gap used when building and checking a schedule.'}
              onChange={(event) => {
                setIntervalTouched(true)
                setIntervalHours(Number(event.target.value))
              }}
            />
          </div>
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
