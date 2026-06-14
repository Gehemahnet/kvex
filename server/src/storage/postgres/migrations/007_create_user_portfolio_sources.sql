CREATE TABLE IF NOT EXISTS user_portfolio_sources (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	type TEXT NOT NULL DEFAULT 'wallet',
	network TEXT NOT NULL,
	address TEXT NOT NULL,
	label TEXT,
	status TEXT NOT NULL DEFAULT 'active',
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT user_portfolio_sources_type_check CHECK (type IN ('wallet')),
	CONSTRAINT user_portfolio_sources_network_check CHECK (network IN ('evm', 'solana')),
	CONSTRAINT user_portfolio_sources_status_check CHECK (status IN ('active', 'disabled')),
	CONSTRAINT user_portfolio_sources_address_not_blank CHECK (length(trim(address)) > 0),
	CONSTRAINT user_portfolio_sources_label_not_blank CHECK (label IS NULL OR length(trim(label)) > 0)
);

CREATE INDEX IF NOT EXISTS user_portfolio_sources_user_id_idx
	ON user_portfolio_sources (user_id);

CREATE INDEX IF NOT EXISTS user_portfolio_sources_user_network_idx
	ON user_portfolio_sources (user_id, network);

CREATE UNIQUE INDEX IF NOT EXISTS user_portfolio_sources_user_network_address_idx
	ON user_portfolio_sources (user_id, network, lower(address));
