-- Seed a disposable login account without storing a plaintext password.
-- From the repository root, securely prompt for the test password and generate its bcrypt hash:
--   export TEST_USER_PASSWORD_HASH="$(cd backend && .venv/bin/python -c 'from app.core.security import hash_password; import getpass; print(hash_password(getpass.getpass()))')"
-- Apply with a direct PostgreSQL connection:
--   PGOPTIONS="-c app.test_user_password_hash=$TEST_USER_PASSWORD_HASH" psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f backend/supabase/migrations/20261115232739_seed_test_user.sql
-- Obtain SUPABASE_DB_URL from the Supabase project's database connection settings.

DO $migration$
DECLARE
    test_password_hash TEXT := current_setting('app.test_user_password_hash', TRUE);
BEGIN
    IF test_password_hash IS NULL
       OR length(test_password_hash) <> 60
       OR test_password_hash !~ '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$' THEN
        RAISE EXCEPTION 'Set app.test_user_password_hash to a valid bcrypt hash before applying this migration';
    END IF;

    INSERT INTO public.users (email, password_hash)
    VALUES ('healthvector-test@example.com', test_password_hash)
    ON CONFLICT (email) DO NOTHING;
END
$migration$;
