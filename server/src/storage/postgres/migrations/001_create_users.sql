CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	login TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT users_login_not_blank CHECK (length(trim(login)) > 0),
	CONSTRAINT users_status_check CHECK (status IN ('active', 'disabled'))
);

CREATE INDEX IF NOT EXISTS users_status_idx ON users (status);
