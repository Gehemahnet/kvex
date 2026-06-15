/** Normalizes user-facing asset symbols for price lookup and de-duplication. */
export const normalizeAssetPriceSymbol = (value: string): string => {
	const symbol = value.trim().toUpperCase();

	if (!/^[A-Z0-9]{1,20}$/.test(symbol)) {
		throw new Error("Invalid asset price symbol");
	}

	return symbol;
};

/** Formats an asset symbol as a USDT quote pair for centralized price APIs. */
export const createUsdtPairSymbol = (symbol: string): string => `${symbol}USDT`;
