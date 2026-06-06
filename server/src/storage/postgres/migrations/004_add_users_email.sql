ALTER TABLE users
	ADD COLUMN IF NOT EXISTS email TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
	ON users (lower(email))
	WHERE email IS NOT NULL;

ALTER TABLE users
	DROP CONSTRAINT IF EXISTS users_email_not_blank;

ALTER TABLE users
	ADD CONSTRAINT users_email_not_blank
	CHECK (email IS NULL OR length(trim(email)) > 0);
