-- ============================================================================
-- PATIENT MEDICATION ASSISTANT - COMPLETE SUPABASE DATABASE SCHEMA
-- Multi-User Auth + Hybrid Leaflet Store (Default + Custom) + pgvector RAG
-- ============================================================================

-- 1. Activare extensie pgvector pentru căutare semantică RAG
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TABEL: Utilizatori / Pacienți (Autentificare Multi-User)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABEL: Prospecte Medicamente (Leaflets)
-- user_id IS NULL     -> Prospect Global / Default (vizibil pentru TOȚI utilizatorii)
-- user_id IS NOT NULL -> Prospect Custom (vizibil DOAR utilizatorului creator)
CREATE TABLE IF NOT EXISTS leaflets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL = Default / Global
    drug_name TEXT NOT NULL,
    leaflet_text TEXT NOT NULL,
    sections JSONB DEFAULT '{}'::jsonb,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constrângeri de unicitate & Indecși pe Prospecte:
-- A) Numele medicamentelor globale (user_id IS NULL) trebuie să fie unice (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_global_leaflets ON leaflets (LOWER(drug_name)) WHERE user_id IS NULL;

-- B) Un utilizator nu poate adăuga de două ori același medicament custom
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_leaflets ON leaflets (user_id, LOWER(drug_name)) WHERE user_id IS NOT NULL;

-- C) Index vectorial IVFFlat pentru căutări rapide RAG
CREATE INDEX IF NOT EXISTS leaflets_embedding_idx ON leaflets USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. TABEL: Medicamente Active (Lista de tratament a fiecărui pacient - FR-01, FR-02)
CREATE TABLE IF NOT EXISTS active_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leaflet_id UUID NOT NULL REFERENCES leaflets(id) ON DELETE CASCADE,
    drug_name TEXT NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_active_drug UNIQUE(user_id, drug_name)
);

-- 5. TABEL: Orare Zilnice și Status Doze (FR-03, FR-05, FR-06)
CREATE TABLE IF NOT EXISTS daily_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    drug_name TEXT NOT NULL,
    scheduled_time TIME NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'taken', 'missed')) DEFAULT 'scheduled',
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. FUNCȚIE RPC: Căutare RAG Hibridă (Prospecte Globale + Prospecte Custom ale Utilizatorului)
CREATE OR REPLACE FUNCTION match_leaflets (
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  drug_name TEXT,
  leaflet_text TEXT,
  sections JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    leaflets.id,
    leaflets.user_id,
    leaflets.drug_name,
    leaflets.leaflet_text,
    leaflets.sections,
    1 - (leaflets.embedding <=> query_embedding) AS similarity
  FROM leaflets
  WHERE (leaflets.user_id IS NULL OR leaflets.user_id = p_user_id)
    AND 1 - (leaflets.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 7. SEED DATA: Prospecte Default pre-existente ale aplicației (vizibile pentru toți utilizatorii)
INSERT INTO leaflets (user_id, drug_name, leaflet_text, sections)
VALUES 
(
  NULL, 
  'Paracetamol', 
  'Paracetamolul este indicat pentru tratamentul simptomatic al durerilor de intensitate ușoară până la moderată și al stărilor febrile. Doza uzuală pentru adulți este de 500-1000 mg la fiecare 4-6 ore. A nu se depăși 4000 mg pe zi.', 
  '{"4.1": "Indicații terapeutice: Dureri ușoare-moderate, febră", "4.2": "Posologie: Adulți 500-1000 mg la 4-6 ore", "4.8": "Reacții adverse: Rareori erupții cutanate, afectare hepatică la supradozaj"}'::jsonb
),
(
  NULL, 
  'Aspirin', 
  'Aspirina (acidul acetilsalicilic) este un analgezic, antiinflamator și antiagregant plachetar. Se utilizează cu precauție în caz de ulcere gastrice.', 
  '{"4.1": "Indicații: Dureri, febră, prevenție cardiovasculară", "4.2": "Posologie: 300-600 mg după masă", "4.5": "Interacțiuni: Risc crescut de sângerare în combinație cu Warfarină"}'::jsonb
),
(
  NULL, 
  'Warfarin', 
  'Warfarina este un anticoagulant oral. Necesită monitorizarea regulată a INR. Interacționează puternic cu Aspirina și Paracetamolul în doze mari.', 
  '{"4.1": "Indicații: Prevenirea trombozei venoase și a emboliei pulmonare", "4.5": "Interacțiuni: Interacțiune majoră cu analgezicele AINS și Aspirina"}'::jsonb
)
ON CONFLICT DO NOTHING;