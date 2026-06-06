CREATE TABLE IF NOT EXISTS user_sessions (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	token_hash TEXT NOT NULL UNIQUE,
	csrf_token_hash TEXT NOT NULL,
	expires_at TIMESTAMPTZ NOT NULL,
	revoked_at TIMESTAMPTZ,
	last_seen_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
	ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS user_sessions_expires_at_idx
	ON user_sessions (expires_at);

CREATE INDEX IF NOT EXISTS user_sessions_active_idx
	ON user_sessions (token_hash)
	WHERE revoked_at IS NULL;
