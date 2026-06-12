const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Returns true when a value looks like a base58 Solana public key. */
export const isSolanaAddress = (value: string): boolean =>
	SOLANA_ADDRESS_PATTERN.test(value);

/** Normalizes a Solana public key for request de-duplication. */
export const normalizeSolanaAddress = (value: string): string => {
	const normalizedValue = value.trim();

	if (!isSolanaAddress(normalizedValue)) {
		throw new Error("Invalid Solana address");
	}

	return normalizedValue;
};
