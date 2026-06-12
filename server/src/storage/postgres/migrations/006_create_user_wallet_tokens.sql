CREATE TABLE IF NOT EXISTS user_wallet_tokens (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	network TEXT NOT NULL,
	token TEXT NOT NULL,
	label TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT user_wallet_tokens_network_check CHECK (network IN ('evm')),
	CONSTRAINT user_wallet_tokens_token_not_blank CHECK (length(trim(token)) > 0),
	CONSTRAINT user_wallet_tokens_label_not_blank CHECK (label IS NULL OR length(trim(label)) > 0)
);

CREATE INDEX IF NOT EXISTS user_wallet_tokens_user_network_idx
	ON user_wallet_tokens (user_id, network);

CREATE UNIQUE INDEX IF NOT EXISTS user_wallet_tokens_user_network_token_idx
	ON user_wallet_tokens (user_id, network, token);
