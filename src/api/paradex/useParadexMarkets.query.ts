import { useQuery } from "@tanstack/vue-query";
import type { UnifiedMarketItem } from "../../types";
import marketEndpoints, { MarketEndpointsKeys } from "./rest/markets.endpoints";
import type {
	GetMarketsItem,
	GetMarketsResponse,
} from "./rest/markets.types.ts";

const paradexItemToUnified = (item: GetMarketsItem): UnifiedMarketItem => ({
	symbol: item.symbol.split("-")[0] ?? item.base_currency,
	fundingRate: item.max_funding_rate,
	tickSize: item.price_tick_size,
	maxOrderSize: item.max_order_size,
});

export const useParadexMarketsQuery = () =>
	useQuery({
		queryKey: [MarketEndpointsKeys.GET_MARKETS],
		queryFn: async () => {
			try {
				const response = await fetch(marketEndpoints.getMarkets());
				if (!response.ok) return [];
				const { results }: GetMarketsResponse = await response.json();
				return results.reduce(
					(resultedArray: UnifiedMarketItem[], item): UnifiedMarketItem[] => {
						if (item.asset_kind !== "PERP") {
							return resultedArray;
						}
						resultedArray.push(paradexItemToUnified(item));
						return resultedArray;
					},
					[],
				);
			} catch (e) {
				console.error(e);
			}
		},
	});
