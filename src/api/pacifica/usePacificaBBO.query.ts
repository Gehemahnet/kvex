import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { ExchangeBBO } from "../../hooks/useSpreadsInfo/useSpreadsInfo.types";
import marketEndpoints from "./rest/markets.endpoints";
import type {
	GetMarketInfoResponse,
	GetPricesResponse,
	OrderbookResponse,
} from "./rest/markets.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

export const PACIFICA_BBO_QUERY_KEY = "PACIFICA_BBO";

export const usePacificaBBOQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [PACIFICA_BBO_QUERY_KEY],
		queryFn: async (): Promise<ExchangeBBO[]> => {
			try {
				// First get the list of markets
				const infoResponse = await fetch(marketEndpoints.getMarketInfo());
				if (!infoResponse.ok) return [];

				const infoData: GetMarketInfoResponse = await infoResponse.json();
				if (!infoData.success) return [];

				// Then get prices for all markets
				const pricesResponse = await fetch(marketEndpoints.getPrices());
				if (!pricesResponse.ok) return [];

				const pricesData: GetPricesResponse = await pricesResponse.json();
				if (!pricesData.success) return [];

				// Create a map of prices by symbol
				const pricesMap = new Map(
					pricesData.data.map((p) => [p.symbol, p]),
				);

				// Fetch orderbooks in parallel for top markets
				const topMarkets = infoData.data.slice(0, 20); // Limit to avoid rate limiting
				const orderbookPromises = topMarkets.map(async (market) => {
					try {
						const obResponse = await fetch(
							marketEndpoints.getOrderbook({ symbol: market.symbol }),
						);
						if (!obResponse.ok) return null;

						const obData: OrderbookResponse = await obResponse.json();
						if (!obData.success) return null;

						const bids = obData.data.l[0];
						const asks = obData.data.l[1];

						const bestBid = bids[0];
						const bestAsk = asks[0];

						if (!bestBid || !bestAsk) return null;

						return {
							exchange: "pacifica" as const,
							symbol: market.symbol,
							bid: bestBid.p,
							bidSize: bestBid.a,
							ask: bestAsk.p,
							askSize: bestAsk.a,
							lastUpdatedAt: obData.data.t,
						};
					} catch {
						return null;
					}
				});

				const orderbooks = await Promise.all(orderbookPromises);
				const result: ExchangeBBO[] = [];

				for (const ob of orderbooks) {
					if (ob) {
						result.push(ob);
					}
				}

				// For markets without orderbook, use mid price
				for (const market of infoData.data) {
					if (result.some((r) => r.symbol === market.symbol)) continue;

					const price = pricesMap.get(market.symbol);
					if (price && price.mid) {
						result.push({
							exchange: "pacifica",
							symbol: market.symbol,
							bid: price.mid,
							bidSize: "0",
							ask: price.mid,
							askSize: "0",
							lastUpdatedAt: price.timestamp,
						});
					}
				}

				return result;
			} catch (e) {
				console.error("Pacifica BBO error:", e);
				return [];
			}
		},
		refetchInterval: 2000,
		enabled,
	});
