ALTER TABLE schedules
    ADD COLUMN IF NOT EXISTS proposals JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS selected_proposal TEXT;
