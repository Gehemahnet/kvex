import { useQuery } from "@tanstack/vue-query";
import type { ComputedRef } from "vue";
import type { UnifiedMarketItem } from "../../types";
import metaEndpoints, {
	createMetaAndAssetCtxsRequest,
	MetaEndpointsKeys,
} from "./rest/meta.endpoints";
import type { MetaAndAssetCtxsResponse } from "./rest/meta.types";

type Params = {
	enabled: ComputedRef<boolean>;
};

export const useHyperliquidMetaQuery = ({ enabled }: Params) =>
	useQuery({
		queryKey: [MetaEndpointsKeys.GET_META_AND_ASSET_CTXS],
		queryFn: async () => {
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

				return assetCtxs
					.map((assetCtx, index): UnifiedMarketItem => {
						const universe = meta.universe[index];
						return {
							symbol: universe?.name ?? "",
							fundingRate: assetCtx.funding,
							tickSize: "",
							maxOrderSize: "",
						};
					})
					.filter((item) => item.fundingRate !== null);
			} catch (e) {
				console.error(e);
				return [];
			}
		},
		refetchInterval: 5000,
		enabled,
	});
