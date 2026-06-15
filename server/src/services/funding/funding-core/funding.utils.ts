import { HOUR_IN_MS } from "#common/constants";
import { Exchange, Period } from "#common/types";
import type { FundingPoint, FundingSeries } from "#services/funding/funding-core/funding.types";

/** Build a normalized funding series for frontend consumption. */
export const createFundingSeries = (
	exchange: Exchange,
	symbol: string,
	sourceSymbol: string,
	points: FundingPoint[],
	options: {
		isFundingAdapted?: boolean;
		requestedTimeframe: Period;
		sourceTimeframe: Period;
	},
): FundingSeries => {
	const normalizedPoints = normalizeFundingPoints(points);

	return {
		exchange,
		symbol,
		sourceSymbol,
		points: normalizedPoints,
		latest: normalizedPoints.at(-1),
		isFundingAdapted: options?.isFundingAdapted ?? false,
		requestedTimeframe: options.requestedTimeframe,
		sourceTimeframe: options.sourceTimeframe,
	};
};

/** Scale funding values when a higher timeframe is derived from a lower one. */
export const annualizeFundingPoints = (
	points: FundingPoint[],
	multiplier: number,
): FundingPoint[] =>
	points.map((point) => ({
		...point,
		fundingRate: point.fundingRate * multiplier,
		nextFundingRate:
			point.nextFundingRate !== undefined
				? point.nextFundingRate * multiplier
				: undefined,
	}));

/** Normalize timestamps to the hour and sort points ascending. */
export const normalizeFundingPoints = (points: FundingPoint[]): FundingPoint[] =>
	[...points]
		.map((point) => ({
			...point,
			timestamp: normalizeFundingTimestamp(point.timestamp),
		}))
		.sort((a, b) => a.timestamp - b.timestamp);

/** Truncate a timestamp to the start of its hour bucket. */
export const normalizeFundingTimestamp = (timestamp: number): number =>
	Math.floor(timestamp / HOUR_IN_MS) * HOUR_IN_MS;
