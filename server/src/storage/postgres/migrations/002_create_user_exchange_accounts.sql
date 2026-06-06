CREATE TABLE IF NOT EXISTS user_exchange_accounts (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
	exchange TEXT NOT NULL,
	label TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'active',
	public_data JSONB NOT NULL DEFAULT '{}'::jsonb,
	capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
	last_checked_at TIMESTAMPTZ,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	CONSTRAINT user_exchange_accounts_label_not_blank CHECK (length(trim(label)) > 0),
	CONSTRAINT user_exchange_accounts_status_check CHECK (status IN ('active', 'disabled', 'error')),
	CONSTRAINT user_exchange_accounts_exchange_check CHECK (
		exchange IN ('hyperliquid', 'pacifica', 'ethereal', 'nado', 'okx')
	),
	CONSTRAINT user_exchange_accounts_public_data_object CHECK (jsonb_typeof(public_data) = 'object'),
	CONSTRAINT user_exchange_accounts_capabilities_object CHECK (jsonb_typeof(capabilities) = 'object')
);

CREATE INDEX IF NOT EXISTS user_exchange_accounts_user_id_idx
	ON user_exchange_accounts (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_exchange_accounts_user_exchange_label_idx
	ON user_exchange_accounts (user_id, exchange, lower(label));
