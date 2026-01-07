import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { UnifiedMarketItem } from "../../types";
import marketEndpoints, { MarketEndpointsKeys } from "./rest/markets.endpoints";
import type {
	MarketSummaryResp,
	MarketsSummaryResponse,
} from "./rest/markets.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

const paradexSummaryToUnified = (
	item: MarketSummaryResp,
): UnifiedMarketItem => ({
	symbol: item.symbol.split("-")[0] ?? item.symbol,
	fundingRate: (
		Number(item.future_funding_rate ?? item.funding_rate) / 8
	).toString(),
	tickSize: "",
	maxOrderSize: "",
});

export const useParadexMarketsSummaryQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [MarketEndpointsKeys.GET_MARKETS_SUMMARY],
		queryFn: async () => {
			try {
				const response = await fetch(
					marketEndpoints.getMarketsSummary({ market: "ALL" }),
				);
				if (!response.ok) return [];
				const { results }: MarketsSummaryResponse = await response.json();

				return results
					.filter(
						(item) =>
							item.funding_rate !== undefined && item.funding_rate !== null,
					)
					.map(paradexSummaryToUnified);
			} catch (e) {
				console.error(e);
				return [];
			}
		},
		refetchInterval: 5000,
		enabled,
	});
