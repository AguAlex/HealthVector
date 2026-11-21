-- Structured per-user dosing for schedule generation (times + quantity).
-- Leaflet sections 4.x remain the RAG/citation source.

ALTER TABLE active_medications
    ADD COLUMN IF NOT EXISTS dosing JSONB DEFAULT '{}'::jsonb;

ALTER TABLE daily_schedule
    ADD COLUMN IF NOT EXISTS quantity TEXT;
