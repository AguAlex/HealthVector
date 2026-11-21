export const MEDICAL_DISCLAIMER = 'Prototype only. Not professional medical advice.'

export default function DisclaimerBanner() {
  return (
    <div className="disclaimer-banner" role="note">
      {MEDICAL_DISCLAIMER}
    </div>
  )
}
