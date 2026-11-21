-- Schedule approval gate, structured interactions, and Ibuprofen leaflet (FR-03, FR-16, FR-17)

ALTER TABLE leaflets DROP CONSTRAINT IF EXISTS leaflets_drug_name_key;

CREATE TABLE IF NOT EXISTS known_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drug_a TEXT NOT NULL,
    drug_b TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('moderate', 'high')),
    warning_message TEXT NOT NULL,
    CONSTRAINT unique_drug_pair UNIQUE (drug_a, drug_b)
);

INSERT INTO known_interactions (drug_a, drug_b, severity, warning_message)
VALUES
    ('warfarin', 'aspirin', 'high', 'High-severity interaction: Warfarin and Aspirin increase bleeding risk. Consult a healthcare professional.'),
    ('warfarin', 'ibuprofen', 'high', 'High-severity interaction: Warfarin and Ibuprofen increase gastrointestinal bleeding risk. Consult a healthcare professional.'),
    ('warfarin', 'paracetamol', 'moderate', 'Potential interaction: high-dose Paracetamol may potentiate Warfarin. Review with a pharmacist.')
ON CONFLICT (drug_a, drug_b) DO NOTHING;

CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('PENDING_APPROVAL', 'APPROVED', 'BLOCKED', 'SUPERSEDED')) DEFAULT 'PENDING_APPROVAL',
    proposed_by TEXT NOT NULL CHECK (proposed_by IN ('user', 'ai')) DEFAULT 'user',
    interaction_severity TEXT CHECK (interaction_severity IN ('none', 'moderate', 'high')) DEFAULT 'none',
    blocked_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_schedule_per_day
    ON schedules (user_id, date)
    WHERE status IN ('PENDING_APPROVAL', 'APPROVED', 'BLOCKED');

ALTER TABLE daily_schedule
    ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS leaflet_id UUID REFERENCES leaflets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_daily_schedule_user_date ON daily_schedule (user_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_schedule_id ON daily_schedule (schedule_id);

INSERT INTO leaflets (user_id, drug_name, leaflet_text, sections)
VALUES (
  NULL,
  'Ibuprofen',
  'Ibuprofenul este un antiinflamator nesteroidian (AINS) indicat pentru dureri ușoare-moderate și febră. Doza uzuală pentru adulți este de 200-400 mg la fiecare 6-8 ore. Nu se asociază cu anticoagulante orale fără supraveghere medicală.',
  '{"4.1": "Indicații: Dureri ușoare-moderate, febră, inflamație", "4.2": "Posologie: Adulți 200-400 mg la 6-8 ore", "4.5": "Interacțiuni: Interacțiune majoră cu Warfarina — risc crescut de sângerare gastrointestinală", "4.8": "Reacții adverse: Dispepsie, ulcer gastric, retenție de fluide"}'::jsonb
)
ON CONFLICT DO NOTHING;

UPDATE leaflets
SET
  leaflet_text = 'Warfarina este un anticoagulant oral. Necesită monitorizarea regulată a INR. Interacționează puternic cu Aspirina, Ibuprofenul și Paracetamolul în doze mari. Doza uzuală se administrează o dată pe zi, de obicei seara.',
  sections = '{"4.1": "Indicații: Prevenirea trombozei venoase și a emboliei pulmonare", "4.2": "Posologie: O dată pe zi, de obicei seara, la 18:00", "4.5": "Interacțiuni: Interacțiune majoră cu AINS (Ibuprofen) și Aspirina; precauție la Paracetamol în doze mari", "4.8": "Reacții adverse: Sângerări, vânătăi ușoare"}'::jsonb
WHERE user_id IS NULL AND LOWER(drug_name) = 'warfarin';
