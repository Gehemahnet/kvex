import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { UnifiedMarketItem } from "../../types";
import marketEndpoints, { MarketEndpointsKeys } from "./rest/markets.endpoints";
import type { GetPricesResponse, PriceInfo } from "./rest/markets.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

const pacificaPriceItemToUnified = (item: PriceInfo): UnifiedMarketItem => ({
	symbol: item.symbol,
	fundingRate: item.next_funding,
	tickSize: "",
	maxOrderSize: "",
});

export const usePacificaFundingDataQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [MarketEndpointsKeys.GET_PRICES],
		queryFn: async () => {
			try {
				const response = await fetch(marketEndpoints.getPrices());
				if (response.ok) {
					const { data }: GetPricesResponse = await response.json();
					return data.map(pacificaPriceItemToUnified);
				}
				return [];
			} catch (e) {
				console.error(e);
				return [];
			}
		},
		refetchInterval: 60000,
		enabled,
	});
