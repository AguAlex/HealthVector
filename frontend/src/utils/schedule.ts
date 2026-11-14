import type { DoseStatuses, Medication, TodayDose } from '../types'

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function doseKey(date: Date, medication: Medication, time: string): string {
  return `${dateKey(date)}|${medication.id}|${time}`
}

export function getDosesForDate(
  date: Date,
  medications: Medication[],
  statuses: DoseStatuses,
  now: Date,
): TodayDose[] {
  const today = dateKey(now)
  const selected = dateKey(date)

  return medications.flatMap((medication) => medication.times.map((time) => {
    const key = doseKey(date, medication, time)
    const savedStatus = statuses[key]
    const elapsed = selected < today || (selected === today && time <
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

    return {
      key,
      medication,
      time,
      status: savedStatus ?? (elapsed ? 'missed' : 'scheduled'),
    }
  })).sort((a, b) => a.time.localeCompare(b.time))
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hours, minutes),
  )
}
