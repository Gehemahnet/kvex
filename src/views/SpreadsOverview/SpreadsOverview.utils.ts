import {
	FUNDING_EXCHANGE_OPTIONS,
} from "../FundingOverview/FundingOverview.constants";
import type { FundingExchange } from "../FundingOverview/FundingOverview.types";
import {
	isFundingExchange,
	normalizeFundingExchanges,
	shouldShowFunding,
} from "../FundingOverview/FundingOverview.utils";
import type {
	SpreadConfidenceBreakdown,
	SpreadExecutableNotionalReason,
	SpreadOpportunity,
	SpreadSide,
} from "./SpreadsOverview.types";

/** Returns true when a persisted value is a valid exchange list. */
export const isSpreadsExchangeList = (
	value: unknown,
): value is FundingExchange[] =>
	Array.isArray(value) && value.every(isFundingExchange);

/** Checks whether enough exchanges are selected to compute pairwise spreads. */
export const hasEnoughSpreadsExchanges = (
	exchanges: FundingExchange[],
): boolean => exchanges.length > 1;

/** Normalizes unknown persisted exchange data into supported exchange ids. */
export const normalizeSpreadsExchanges = (
	exchanges: unknown,
): FundingExchange[] => normalizeFundingExchanges(exchanges);

/** Resolves a human-readable exchange label for spread table cells. */
export const getSpreadExchangeLabel = (exchange: FundingExchange): string =>
	FUNDING_EXCHANGE_OPTIONS.find((option) => option.value === exchange)?.label ??
	exchange;

/** Coerces a user-entered numeric filter and falls back for invalid values. */
export const normalizeSpreadsNumber = (
	value: unknown,
	fallback: number,
): number => {
	const numberValue = Number(value);

	return Number.isNaN(numberValue) || numberValue < 0 ? fallback : numberValue;
};

/** Runtime guard for persisted boolean preferences. */
export const isBoolean = (value: unknown): value is boolean =>
	typeof value === "boolean";

/** Formats decimal ratio values as three-decimal percentage strings. */
export const formatSpreadPercent = (value?: number): string => {
	if (value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return `${(value * 100).toFixed(3)}%`;
};

/** Formats exchange prices while preserving useful sub-cent precision. */
export const formatSpreadPrice = (value?: number): string => {
	if (value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return new Intl.NumberFormat("en", {
		maximumFractionDigits: 6,
		minimumFractionDigits: 0,
	}).format(value);
};

/** Formats executable notional values as whole-dollar amounts. */
export const formatUsdNotional = (value?: number): string => {
	if (value === undefined || Number.isNaN(value)) {
		return "-";
	}

	return new Intl.NumberFormat("en", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(value);
};

/** Converts backend executable-size reason codes into UI tooltip text. */
export const formatExecutableNotionalReason = (
	reason?: SpreadExecutableNotionalReason,
): string => {
	switch (reason) {
		case "available":
			return "Top-of-book size is available.";
		case "missing-long-ask":
			return "Long ask price is missing.";
		case "missing-long-ask-size":
			return "Long ask size is missing.";
		case "missing-short-bid":
			return "Short bid price is missing.";
		case "missing-short-bid-size":
			return "Short bid size is missing.";
		default:
			return "Top-of-book size is missing.";
	}
};

/** Formats the stability count and lifetime compactly for the table. */
export const formatSpreadStability = (
	stability?: { occurrences: number; lifetimeMs: number },
): string => {
	if (stability === undefined) {
		return "-";
	}

	const seconds = Math.floor(stability.lifetimeMs / 1000);

	return `${stability.occurrences} / ${seconds}s`;
};

/** Formats the preferred rolling average spread for a stable signal. */
export const formatAverageSpread = (
	stability?: {
		averageEstimatedNetSpreadPercent?: number;
		averagePriceSpreadPercent: number;
	},
): string =>
	formatSpreadPercent(
		stability?.averageEstimatedNetSpreadPercent ??
			stability?.averagePriceSpreadPercent,
	);

/** Formats annualized funding spread while hiding empty zero values. */
export const formatSpreadFunding = (value?: number): string => {
	if (!shouldShowFunding(value)) {
		return "-";
	}

	return `${(value * 100).toFixed(2)}%`;
};

/** Formats selected holding-period funding impact with finer precision. */
export const formatFundingImpact = (value?: number): string => {
	if (!shouldShowFunding(value)) {
		return "-";
	}

	return `${(value * 100).toFixed(4)}%`;
};

/** Formats aggregate execution slippage only when it affects the estimate. */
export const formatSlippage = (value?: number): string => {
	if (value === undefined || Number.isNaN(value) || value <= 0) {
		return "";
	}

	return `Slip ${formatSpreadPercent(value)}`;
};

/** Formats snapshot freshness age for compact table display. */
export const formatSnapshotAge = (ageMs?: number): string => {
	if (ageMs === undefined) {
		return "-";
	}

	if (ageMs < 1000) {
		return `${ageMs} ms`;
	}

	return `${(ageMs / 1000).toFixed(1)} s`;
};

/** Chooses positive/negative spread coloring classes. */
export const getSpreadValueClass = (value?: number): string => {
	if ((value ?? 0) > 0) {
		return "text-[var(--kvex-success-color)]";
	}

	if ((value ?? 0) < 0) {
		return "text-[var(--kvex-danger-color)]";
	}

	return "";
};

/** Returns true when either side uses documentation fallback fees. */
export const hasDocumentedFeeSource = (
	opportunity: SpreadOpportunity,
): boolean =>
	opportunity.long.feeSource === "documentation" ||
	opportunity.short.feeSource === "documentation";

/** Returns true when the backend could compute a fee-adjusted spread. */
export const hasFeeAdjustedSpread = (
	opportunity: SpreadOpportunity,
): boolean =>
	opportunity.feeAdjustedPriceSpreadPercent !== undefined &&
	!Number.isNaN(opportunity.feeAdjustedPriceSpreadPercent);

/** Flags fee-adjusted values that should be styled as approximate. */
export const shouldWarnAboutFeeAdjustedSpread = (
	opportunity: SpreadOpportunity,
): boolean =>
	hasFeeAdjustedSpread(opportunity) && hasDocumentedFeeSource(opportunity);

/** Explains whether fee estimates are exact API values or approximations. */
export const formatFeeSourceTooltip = (
	opportunity: SpreadOpportunity,
): string =>
	shouldWarnAboutFeeAdjustedSpread(opportunity)
		? "Fees may be approximate. See the documentation for details."
		: "Fees are included in this estimate.";

/** Chooses confidence coloring classes by coarse confidence bands. */
export const getConfidenceClass = (confidence: number): string => {
	if (confidence >= 0.9) {
		return "text-[var(--kvex-success-color)]";
	}

	if (confidence >= 0.7) {
		return "text-[var(--kvex-text-color)]";
	}

	return "text-[var(--kvex-danger-color)]";
};

/** Applies client-only table filters on top of backend spread filters. */
export const filterSpreadOpportunities = (
	opportunities: SpreadOpportunity[],
	symbolSearch: string,
	options: {
		hideStale: boolean;
		minConfidence: number;
		onlyFeeAdjusted: boolean;
	},
): SpreadOpportunity[] => {
	const search = symbolSearch.trim().toUpperCase();
	return opportunities
		.filter((opportunity) => !search || opportunity.symbol.includes(search))
		.filter((opportunity) => !options.hideStale || !opportunity.isStale)
		.filter((opportunity) => opportunity.confidence >= options.minConfidence)
		.filter((opportunity) =>
			!options.onlyFeeAdjusted || hasFeeAdjustedSpread(opportunity),
		);
};

/** Returns the empty-state message for the selected exchange count. */
export const getSpreadsSelectionStatus = (
	selectedExchangeCount: number,
): string => {
	if (selectedExchangeCount === 0) {
		return "Select data sources to compare spreads.";
	}

	if (selectedExchangeCount === 1) {
		return "Select at least two data sources to compare spreads.";
	}

	return "";
};

/** Formats a spread side label without repeating source ticker names. */
export const formatSpreadSide = (side: SpreadSide): string =>
	getSpreadExchangeLabel(side.exchange);

/** Formats quote and settlement identity details for a spread side. */
export const formatSpreadMarketIdentity = (side: SpreadSide): string => {
	if (side.quoteAsset === undefined && side.settlementAsset === undefined) {
		return "";
	}

	if (
		side.quoteAsset !== undefined &&
		side.settlementAsset !== undefined &&
		side.quoteAsset !== side.settlementAsset
	) {
		return ` · ${side.quoteAsset}/${side.settlementAsset}`;
	}

	return ` · ${side.quoteAsset ?? side.settlementAsset}`;
};

/** Formats confidence breakdown lines for the PrimeVue tooltip. */
export const formatConfidenceTooltip = (
	breakdown?: SpreadConfidenceBreakdown,
): string =>
	[
		formatConfidenceTooltipLine("Price source", breakdown?.priceSource),
		formatConfidenceTooltipLine("Freshness", breakdown?.freshness),
		formatConfidenceTooltipLine("Funding", breakdown?.funding),
		formatConfidenceTooltipLine("Fees", breakdown?.fees, {
			hideReason: true,
		}),
		formatConfidenceTooltipLine("Liquidity", breakdown?.liquidity),
	].filter(Boolean).join("\n");

const formatConfidenceTooltipLine = (
	label: string,
	component?: {
		score: number;
		weight: number;
		weightedScore: number;
		reason?: string;
	},
	options: {
		hideReason?: boolean;
	} = {},
): string | undefined => {
	if (!component) {
		return `${label}: no data`;
	}

	const safeReason = options.hideReason ? undefined : component.reason;
	const reason = safeReason ? ` - ${safeReason}` : "";

	return `${label}: ${formatCompactPercent(component.score)} · weight ${formatCompactPercent(component.weight)}${reason}`;
};

const formatCompactPercent = (value: number): string =>
	`${(value * 100).toFixed(1)}%`;
