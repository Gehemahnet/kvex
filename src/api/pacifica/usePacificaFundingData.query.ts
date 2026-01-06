import { useQuery } from "@tanstack/vue-query";
import type { UnifiedMarketItem } from "../../types";
import marketEndpoints, { MarketEndpointsKeys } from "./rest/markets.endpoints";
import type { GetPricesResponse, PriceInfo } from "./rest/markets.types";

/**
 * Преобразует данные о ценах Pacifica в унифицированный формат
 * Использует next_funding для получения предсказанной ставки финансирования
 */
const pacificaPriceItemToUnified = (item: PriceInfo): UnifiedMarketItem => ({
	symbol: item.symbol,
	fundingRate: item.next_funding,
	tickSize: "0", // Не доступно в prices endpoint
	maxOrderSize: "0", // Не доступно в prices endpoint
});

/**
 * Хук для получения данных о финансировании Pacifica
 * Обновляется каждую минуту
 * Использует поле next_funding из /api/v1/info/prices
 */
export const usePacificaFundingDataQuery = () =>
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
		refetchInterval: 60000, // Обновление каждую минуту (60000 мс)
	});
