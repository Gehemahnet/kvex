import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { fundingApi } from "@api/funding";
import type {
	FundingExchange,
	FundingTimeframe,
} from "@api/funding";
import { FUNDING_OVERVIEW_CACHE_TTL_MS } from "./FundingOverview.constants";

type UseFundingOverviewQueryParams = {
	timeframe: MaybeRefOrGetter<FundingTimeframe>;
	exchanges: MaybeRefOrGetter<FundingExchange[]>;
};

export const FUNDING_OVERVIEW_QUERY_KEY = "funding-overview";

/** Creates a cached TanStack Query resource for the funding overview table. */
export const useFundingOverviewQuery = (
	params: UseFundingOverviewQueryParams,
) =>
	useQuery({
		queryKey: computed(() => [
			FUNDING_OVERVIEW_QUERY_KEY,
			toValue(params.timeframe),
			toValue(params.exchanges).join(","),
		]),
		enabled: computed(() => toValue(params.exchanges).length > 0),
		queryFn: () =>
			fundingApi.getOverview({
				timeframe: toValue(params.timeframe),
				exchanges: toValue(params.exchanges),
			}),
		staleTime: FUNDING_OVERVIEW_CACHE_TTL_MS,
		gcTime: FUNDING_OVERVIEW_CACHE_TTL_MS,
		refetchInterval: FUNDING_OVERVIEW_CACHE_TTL_MS,
	});
