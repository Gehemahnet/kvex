/** Formats optional exchange decimal strings for trading tables. */
export const formatTradingDecimal = (value?: string): string => {
	if (value === undefined || value.trim() === "") {
		return "-";
	}

	const parsed = Number.parseFloat(value);

	if (!Number.isFinite(parsed)) {
		return value;
	}

	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: Math.abs(parsed) >= 1 ? 4 : 8,
	}).format(parsed);
};

/** Formats optional USD position values. */
export const formatTradingUsd = (value?: string): string => {
	if (value === undefined) {
		return "-";
	}

	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed)
		? new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 2,
		}).format(parsed)
		: value;
};

/** Formats a position notional in the exchange settlement asset. */
export const formatTradingQuoteValue = (
	value: string | undefined,
	quoteAsset: string,
): string => {
	if (value === undefined) {
		return "-";
	}

	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed)
		? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(parsed)} ${quoteAsset}`
		: `${value} ${quoteAsset}`;
};

export const getTradingExchangeLabel = (exchange: string): string => ({
	ethereal: "Ethereal",
	hyperliquid: "Hyperliquid",
	nado: "Nado",
	okx: "OKX",
	pacifica: "Pacifica",
}[exchange] ?? exchange);

export const hasFlexibleLeverage = (position: {
	exchange: string;
	leverage?: number;
	marginMode?: "cross" | "isolated";
}): boolean =>
	position.exchange === "nado"
	&& position.marginMode === "cross"
	&& position.leverage === undefined;

export const getFlexibleLeverageTooltip = (exchange: string): string =>
	`${getTradingExchangeLabel(exchange)} uses flexible leverage for cross-margin positions. `
	+ `The effective leverage depends on the account margin and position size. `
	+ `Refer to the exchange documentation for details.`;

export const getTradingPnlClass = (value?: string): string => {
	const parsed = value === undefined ? Number.NaN : Number.parseFloat(value);

	if (!Number.isFinite(parsed) || parsed === 0) {
		return "text-[var(--kvex-text-muted-color)]";
	}

	return parsed > 0 ? "text-emerald-500" : "text-red-500";
};
