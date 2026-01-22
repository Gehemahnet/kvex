import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { ExchangeBBO } from "../../hooks/useSpreadsInfo/useSpreadsInfo.types";
import metaEndpoints, { createMetaAndAssetCtxsRequest } from "./rest/meta.endpoints";
import type { MetaAndAssetCtxsResponse } from "./rest/meta.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

export const HYPERLIQUID_BBO_QUERY_KEY = "HYPERLIQUID_BBO";

export const useHyperliquidBBOQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [HYPERLIQUID_BBO_QUERY_KEY],
		queryFn: async (): Promise<ExchangeBBO[]> => {
			try {
				const response = await fetch(metaEndpoints.getMetaAndAssetCtxs(), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(createMetaAndAssetCtxsRequest()),
				});

				if (!response.ok) return [];

				const data: MetaAndAssetCtxsResponse = await response.json();
				const [meta, assetCtxs] = data;

				const result: ExchangeBBO[] = [];

				for (let i = 0; i < assetCtxs.length; i++) {
					const assetCtx = assetCtxs[i];
					const universe = meta.universe[i];

					if (!universe || !assetCtx) continue;

					// impactPxs contains [bid impact price, ask impact price]
					// If not available, use midPx for both
					let bid: string;
					let ask: string;

					if (assetCtx.impactPxs?.[0] && assetCtx.impactPxs?.[1]) {
						bid = assetCtx.impactPxs[0];
						ask = assetCtx.impactPxs[1];
					} else if (assetCtx.midPx) {
						bid = assetCtx.midPx;
						ask = assetCtx.midPx;
					} else {
						// Use mark price as fallback
						bid = assetCtx.markPx;
						ask = assetCtx.markPx;
					}

					result.push({
						exchange: "hyperliquid",
						symbol: universe.name,
						bid,
						bidSize: "0", // Not directly available
						ask,
						askSize: "0",
						lastUpdatedAt: Date.now(),
					});
				}

				return result;
			} catch (e) {
				console.error("Hyperliquid BBO error:", e);
				return [];
			}
		},
		refetchInterval: 2000,
		enabled,
	});
