ALTER TABLE user_exchange_accounts
	DROP CONSTRAINT IF EXISTS user_exchange_accounts_exchange_check;

ALTER TABLE user_exchange_accounts
	ADD CONSTRAINT user_exchange_accounts_exchange_check CHECK (
		exchange IN ('hyperliquid', 'pacifica', 'ethereal', 'nado', 'okx', 'variational')
	);
