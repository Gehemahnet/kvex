import { useQuery } from "@tanstack/vue-query";
import type { UnifiedMarketItem } from "../../types";
import marketEndpoints, { MarketEndpointsKeys } from "./rest/markets.endpoints";
import type { GetMarketInfoResponse, MarketInfo } from "./rest/markets.types";

const paradexItemToUnified = (item: MarketInfo): UnifiedMarketItem => ({
	symbol: item.symbol,
	fundingRate: item.funding_rate,
	tickSize: item.tick_size,
	maxOrderSize: item.max_order_size,
});
export const usePacificaMarketsQuery = () =>
	useQuery({
		queryKey: [MarketEndpointsKeys.GET_MARKET_INFO],
		queryFn: async () => {
			try {
				const response = await fetch(marketEndpoints.getMarketInfo());
				if (response.ok) {
					const { data }: GetMarketInfoResponse = await response.json();
					return data.map(paradexItemToUnified);
				}
				return [];
			} catch (e) {
				console.error(e);
			}
		},
	});
