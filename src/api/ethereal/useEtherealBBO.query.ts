import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { ExchangeBBO } from "../../hooks/useSpreadsInfo/useSpreadsInfo.types";
import productEndpoints from "./rest/products.endpoints";
import type {
	ListOfMarketPriceDtos,
	PageOfProductDtos,
} from "./rest/products.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

export const ETHEREAL_BBO_QUERY_KEY = "ETHEREAL_BBO";

export const useEtherealBBOQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [ETHEREAL_BBO_QUERY_KEY],
		queryFn: async (): Promise<ExchangeBBO[]> => {
			try {
				// Get products list
				const productsResponse = await fetch(productEndpoints.getProducts());
				if (!productsResponse.ok) return [];

				const productsData: PageOfProductDtos = await productsResponse.json();

				// Filter only PERP products
				const perpProducts = productsData.data.filter(
					(p) => p.engineType === 0, // EngineType.PERP
				);

				if (perpProducts.length === 0) return [];

				// Get market prices with product IDs
				const productIds = perpProducts.map((p) => p.id);
				const pricesResponse = await fetch(
					productEndpoints.getMarketPrice(productIds),
				);

				// If market-price fails, return empty (Ethereal may not support this endpoint)
				if (!pricesResponse.ok) {
					console.warn("Ethereal market-price returned", pricesResponse.status);
					return [];
				}

				const pricesData: ListOfMarketPriceDtos = await pricesResponse.json();

				// Create a map of prices by product ID
				const pricesMap = new Map(
					pricesData.data.map((p) => [p.productId, p]),
				);

				const result: ExchangeBBO[] = [];

				for (const product of perpProducts) {
					const price = pricesMap.get(product.id);

					if (price && price.bestBidPrice && price.bestAskPrice) {
						result.push({
							exchange: "ethereal",
							symbol: product.ticker,
							bid: price.bestBidPrice,
							bidSize: "0", // Not provided in the API
							ask: price.bestAskPrice,
							askSize: "0",
							lastUpdatedAt: Date.now(),
						});
					}
				}

				return result;
			} catch (e) {
				console.error("Ethereal BBO error:", e);
				return [];
			}
		},
		refetchInterval: 2000,
		enabled,
	});
