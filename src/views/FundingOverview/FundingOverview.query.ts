import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type {
	FundingExchange,
	FundingOverviewResponse,
	FundingTimeframe,
} from "./FundingOverview.types";

type FundingOverviewRequestParams = {
	timeframe: FundingTimeframe;
	exchanges: FundingExchange[];
};

type UseFundingOverviewQueryParams = {
	timeframe: MaybeRefOrGetter<FundingTimeframe>;
	exchanges: MaybeRefOrGetter<FundingExchange[]>;
};

export const FUNDING_OVERVIEW_QUERY_KEY = "funding-overview";

const getFundingOverview = async (
	params: FundingOverviewRequestParams,
): Promise<FundingOverviewResponse> => {
	const query = new URLSearchParams({
		timeframe: params.timeframe,
	});

	if (params.exchanges.length > 0) {
		query.set("exchanges", params.exchanges.join(","));
	}

	const response = await fetch(`/funding/overview?${query.toString()}`);

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

export const useFundingOverviewQuery = (
	params: UseFundingOverviewQueryParams,
) =>
	useQuery({
		queryKey: computed(() => [
			FUNDING_OVERVIEW_QUERY_KEY,
			toValue(params.timeframe),
			toValue(params.exchanges).join(","),
		]),
		queryFn: () =>
			getFundingOverview({
				timeframe: toValue(params.timeframe),
				exchanges: toValue(params.exchanges),
			}),
	});
