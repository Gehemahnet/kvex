import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { FundingExchange } from "../FundingOverview/FundingOverview.types";
import { SPREADS_CACHE_TTL_MS } from "./SpreadsOverview.constants";
import type { SpreadsResponse } from "./SpreadsOverview.types";

type SpreadsRequestParams = {
	exchanges: FundingExchange[];
	symbol?: string;
	minPriceSpreadPercent?: number;
	maxSnapshotAgeMs?: number;
	positionSizeUsd?: number;
	minOccurrences?: number;
	minLifetimeMs?: number;
	holdingPeriodHours?: number;
};

type UseSpreadsQueryParams = {
	exchanges: MaybeRefOrGetter<FundingExchange[]>;
	symbol?: MaybeRefOrGetter<string>;
	minPriceSpreadPercent: MaybeRefOrGetter<number>;
	maxSnapshotAgeMs: MaybeRefOrGetter<number>;
	positionSizeUsd: MaybeRefOrGetter<number>;
	minOccurrences: MaybeRefOrGetter<number>;
	minLifetimeMs: MaybeRefOrGetter<number>;
	holdingPeriodHours: MaybeRefOrGetter<number>;
};

export const SPREADS_QUERY_KEY = "spreads";

/**
 * Builds the Vue Query cache key for spread requests. Numeric filters that are
 * effectively disabled are normalized out so REST fetches and socket updates
 * address the same cache entry.
 */
export const createSpreadsQueryKey = (params: SpreadsRequestParams) => [
	SPREADS_QUERY_KEY,
	params.exchanges.join(","),
	(params.symbol ?? "").trim().toUpperCase(),
	params.minPriceSpreadPercent,
	params.maxSnapshotAgeMs,
	normalizePositionSizeFilter(params.positionSizeUsd),
	normalizeIntegerFilter(params.minOccurrences),
	normalizePositiveNumberFilter(params.minLifetimeMs),
	normalizePositiveNumberFilter(params.holdingPeriodHours),
];

const getSpreads = async (
	params: SpreadsRequestParams,
): Promise<SpreadsResponse> => {
	const query = new URLSearchParams();

	if (params.exchanges.length > 0) {
		query.set("exchanges", params.exchanges.join(","));
	}

	if (params.symbol) {
		query.set("symbol", params.symbol);
	}

	if (params.minPriceSpreadPercent !== undefined) {
		query.set("minPriceSpreadPercent", String(params.minPriceSpreadPercent));
	}

	if (params.maxSnapshotAgeMs !== undefined) {
		query.set("maxSnapshotAgeMs", String(params.maxSnapshotAgeMs));
	}

	if (params.positionSizeUsd !== undefined && params.positionSizeUsd > 0) {
		query.set("positionSizeUsd", String(params.positionSizeUsd));
	}

	if (params.minOccurrences !== undefined && params.minOccurrences > 0) {
		query.set("minOccurrences", String(Math.floor(params.minOccurrences)));
	}

	if (params.minLifetimeMs !== undefined && params.minLifetimeMs > 0) {
		query.set("minLifetimeMs", String(params.minLifetimeMs));
	}

	if (params.holdingPeriodHours !== undefined && params.holdingPeriodHours > 0) {
		query.set("holdingPeriodHours", String(params.holdingPeriodHours));
	}

	const response = await fetch(`/api/spreads?${query.toString()}`);

	if (!response.ok) {
		const body = await response.json().catch(() => undefined) as
			| { error?: { message?: string } }
			| undefined;

		throw new Error(
			body?.error?.message ?? `Spreads request failed: ${response.status}`,
		);
	}

	return response.json() as Promise<SpreadsResponse>;
};

/**
 * Fetches the initial spread opportunities payload; live updates continue via
 * Socket.IO once the first REST response has hydrated the query cache.
 */
export const useSpreadsQuery = (params: UseSpreadsQueryParams) =>
	useQuery({
		queryKey: computed(() => [
			...createSpreadsQueryKey({
				exchanges: toValue(params.exchanges),
				symbol: params.symbol ? toValue(params.symbol) : "",
				minPriceSpreadPercent: toValue(params.minPriceSpreadPercent),
				maxSnapshotAgeMs: toValue(params.maxSnapshotAgeMs),
				positionSizeUsd: toValue(params.positionSizeUsd),
				minOccurrences: toValue(params.minOccurrences),
				minLifetimeMs: toValue(params.minLifetimeMs),
				holdingPeriodHours: toValue(params.holdingPeriodHours),
			}),
		]),
		enabled: computed(() => toValue(params.exchanges).length > 1),
		queryFn: () =>
			getSpreads({
				exchanges: toValue(params.exchanges),
				symbol: params.symbol
					? toValue(params.symbol).trim().toUpperCase() || undefined
					: undefined,
				minPriceSpreadPercent: toValue(params.minPriceSpreadPercent),
				maxSnapshotAgeMs: toValue(params.maxSnapshotAgeMs),
				positionSizeUsd: toValue(params.positionSizeUsd),
				minOccurrences: toValue(params.minOccurrences),
				minLifetimeMs: toValue(params.minLifetimeMs),
				holdingPeriodHours: toValue(params.holdingPeriodHours),
			}),
		staleTime: SPREADS_CACHE_TTL_MS,
		gcTime: SPREADS_CACHE_TTL_MS,
	});

const normalizePositionSizeFilter = (value?: number): number | undefined =>
	value !== undefined && value > 0 ? value : undefined;

const normalizeIntegerFilter = (value?: number): number | undefined =>
	value !== undefined && value > 0 ? Math.floor(value) : undefined;

const normalizePositiveNumberFilter = (value?: number): number | undefined =>
	value !== undefined && value > 0 ? value : undefined;
