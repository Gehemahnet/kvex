import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type {
	FundingExchange,
	FundingOverviewResponse,
	FundingTimeframe,
} from "./FundingOverview.types";
import { FUNDING_OVERVIEW_CACHE_TTL_MS } from "./FundingOverview.constants";

type FundingOverviewRequestParams = {
	timeframe: FundingTimeframe;
	exchanges: FundingExchange[];
};

type UseFundingOverviewQueryParams = {
	timeframe: MaybeRefOrGetter<FundingTimeframe>;
	exchanges: MaybeRefOrGetter<FundingExchange[]>;
};

export const FUNDING_OVERVIEW_QUERY_KEY = "funding-overview";

/** Requests the funding overview endpoint with timeframe and exchange filters. */
const getFundingOverview = async (
	params: FundingOverviewRequestParams,
): Promise<FundingOverviewResponse> => {
	const query = new URLSearchParams({
		timeframe: params.timeframe,
	});

	if (params.exchanges.length > 0) {
		query.set("exchanges", params.exchanges.join(","));
	}

	const response = await fetch(`/api/funding/overview?${query.toString()}`);

	if (!response.ok) {
		const body = await response.json().catch(() => undefined) as
			| { error?: { message?: string } }
			| undefined;

		throw new Error(
			body?.error?.message ?? `Funding request failed: ${response.status}`,
		);
	}

	return response.json() as Promise<FundingOverviewResponse>;
};

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
			getFundingOverview({
				timeframe: toValue(params.timeframe),
				exchanges: toValue(params.exchanges),
			}),
		staleTime: FUNDING_OVERVIEW_CACHE_TTL_MS,
		gcTime: FUNDING_OVERVIEW_CACHE_TTL_MS,
		refetchInterval: FUNDING_OVERVIEW_CACHE_TTL_MS,
	});
