export type MedicationCatalogOption = {
  name: string
  strengths: string[]
}

type RxTermsResponse = [
  number,
  string[],
  {
    STRENGTHS_AND_FORMS?: Array<string[] | null>
  },
  unknown[],
]

const RXTERMS_URL = 'https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search'

export async function searchMedicationCatalog(
  term: string,
  signal: AbortSignal,
): Promise<MedicationCatalogOption[]> {
  const url = new URL(RXTERMS_URL)
  url.searchParams.set('terms', term)
  url.searchParams.set('ef', 'DISPLAY_NAME,STRENGTHS_AND_FORMS')
  url.searchParams.set('count', '7')

  let response: Response
  try {
    response = await fetch(url, { signal })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('Medication catalog is unavailable. You can still enter details manually.')
  }
  if (!response.ok) {
    throw new Error(`Medication catalog request failed (${response.status}).`)
  }

  const body: RxTermsResponse = await response.json()
  const names = body[1]
  const strengths = body[2]?.STRENGTHS_AND_FORMS ?? []
  if (!Array.isArray(names)) {
    throw new Error('Medication catalog returned an unexpected response.')
  }

  return names.map((name, index) => ({
    name,
    strengths: Array.isArray(strengths[index])
      ? strengths[index].map((strength) => strength.trim()).filter(Boolean)
      : [],
  }))
}
