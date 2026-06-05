import type { Exchange } from "../../common/types";
import { SUPPORTED_FUNDING_EXCHANGES } from "../../services/funding/funding.constants";
import type { MarketSnapshotsQuery } from "../../services/markets/market-snapshots.types";
import type { SpreadsQuery } from "../../services/spreads/spreads.types";
import type {
	MarketSnapshotsSubscribePayload,
	SpreadsSubscribePayload,
} from "./market-data-socket.types";

/** Parses and validates a market snapshot subscription payload from Socket.IO. */
export const parseMarketSnapshotsSocketPayload = (
	payload?: MarketSnapshotsSubscribePayload,
): MarketSnapshotsQuery => ({
	exchanges: parseSocketExchanges(payload?.exchanges),
	...(payload?.symbol ? { symbol: normalizeSocketSymbol(payload.symbol) } : {}),
});

/** Parses and validates a spreads subscription payload from Socket.IO. */
export const parseSpreadsSocketPayload = (
	payload?: SpreadsSubscribePayload,
): SpreadsQuery => ({
	...parseMarketSnapshotsSocketPayload(payload),
	...(payload?.minPriceSpreadPercent !== undefined
		? {
				minPriceSpreadPercent: parseSocketNonNegativeNumber(
					payload.minPriceSpreadPercent,
					"minPriceSpreadPercent",
				),
			}
		: {}),
	...(payload?.maxSnapshotAgeMs !== undefined
		? {
				maxSnapshotAgeMs: parseSocketNonNegativeNumber(
					payload.maxSnapshotAgeMs,
					"maxSnapshotAgeMs",
				),
			}
		: {}),
	...(payload?.positionSizeUsd !== undefined
		? {
				positionSizeUsd: parseSocketNonNegativeNumber(
					payload.positionSizeUsd,
					"positionSizeUsd",
				),
			}
		: {}),
	...(payload?.minOccurrences !== undefined
		? {
				minOccurrences: parseSocketNonNegativeInteger(
					payload.minOccurrences,
					"minOccurrences",
				),
			}
		: {}),
	...(payload?.minLifetimeMs !== undefined
		? {
				minLifetimeMs: parseSocketNonNegativeNumber(
					payload.minLifetimeMs,
					"minLifetimeMs",
				),
			}
		: {}),
	...(payload?.holdingPeriodHours !== undefined
		? {
				holdingPeriodHours: parseSocketNonNegativeNumber(
					payload.holdingPeriodHours,
					"holdingPeriodHours",
				),
			}
		: {}),
});

const parseSocketExchanges = (exchanges?: Exchange[]): Exchange[] => {
	if (!exchanges) {
		return SUPPORTED_FUNDING_EXCHANGES;
	}

	const normalizedExchanges = exchanges
		.map((exchange) => exchange.trim().toLowerCase())
		.filter(Boolean);

	if (normalizedExchanges.length === 0) {
		return [];
	}

	const invalidExchanges = normalizedExchanges.filter(
		(exchange) => !SUPPORTED_FUNDING_EXCHANGES.includes(exchange as Exchange),
	);

	if (invalidExchanges.length > 0) {
		throw new Error(`Unsupported exchanges: ${invalidExchanges.join(",")}`);
	}

	return [...new Set(normalizedExchanges as Exchange[])];
};

const normalizeSocketSymbol = (symbol: string): string => symbol.trim().toUpperCase();

const parseSocketNonNegativeNumber = (value: number, key: string): number => {
	if (Number.isNaN(value) || value < 0) {
		throw new Error(`${key} must be a non-negative number`);
	}

	return value;
};

const parseSocketNonNegativeInteger = (value: number, key: string): number => {
	if (Number.isNaN(value) || value < 0 || !Number.isInteger(value)) {
		throw new Error(`${key} must be a non-negative integer`);
	}

	return value;
};
