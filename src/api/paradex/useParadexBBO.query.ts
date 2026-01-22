import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { ExchangeBBO } from "../../hooks/useSpreadsInfo/useSpreadsInfo.types";
import marketEndpoints from "./rest/markets.endpoints";
import type { MarketsSummaryResponse } from "./rest/markets.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

export const PARADEX_BBO_QUERY_KEY = "PARADEX_BBO";

export const useParadexBBOQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [PARADEX_BBO_QUERY_KEY],
		queryFn: async (): Promise<ExchangeBBO[]> => {
			try {
				const response = await fetch(
					marketEndpoints.getMarketsSummary({ market: "ALL" }),
				);
				if (!response.ok) return [];

				const { results }: MarketsSummaryResponse = await response.json();

				return results
					.filter((item) => item.symbol.endsWith("-USD-PERP"))
					.map((item): ExchangeBBO => ({
						exchange: "paradex",
						symbol: item.symbol,
						bid: item.bid,
						bidSize: "0", // Summary doesn't provide size
						ask: item.ask,
						askSize: "0",
						lastUpdatedAt: item.created_at,
					}));
			} catch (e) {
				console.error("Paradex BBO error:", e);
				return [];
			}
		},
		refetchInterval: 2000, // Faster for spreads
		enabled,
	});
