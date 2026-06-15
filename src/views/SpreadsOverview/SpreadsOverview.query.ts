import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import {
	spreadsApi,
	type SpreadsRequestParams,
} from "@api/spreads";
import type { FundingExchange } from "@api/funding";
import { SPREADS_CACHE_TTL_MS } from "./SpreadsOverview.constants";

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

/**
 * Fetches the initial spread opportunities payload; live updates continue via
 * Socket.IO once the first REST response has hydrated the query cache.
 */
export const useSpreadsQuery = (params: UseSpreadsQueryParams) =>
	useQuery({
		queryKey: computed(() => [
			...createSpreadsQueryKey(resolveSpreadsRequestParams(params)),
		]),
		enabled: computed(() => toValue(params.exchanges).length > 1),
		queryFn: () => spreadsApi.getSpreads(resolveSpreadsRequestParams(params)),
		staleTime: SPREADS_CACHE_TTL_MS,
		gcTime: SPREADS_CACHE_TTL_MS,
	});

const resolveSpreadsRequestParams = (
	params: UseSpreadsQueryParams,
): SpreadsRequestParams => ({
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
});

const normalizePositionSizeFilter = (value?: number): number | undefined =>
	value && value > 0 ? value : undefined;

const normalizeIntegerFilter = (value?: number): number | undefined =>
	value && value > 0 ? Math.floor(value) : undefined;

const normalizePositiveNumberFilter = (value?: number): number | undefined =>
	value && value > 0 ? value : undefined;
