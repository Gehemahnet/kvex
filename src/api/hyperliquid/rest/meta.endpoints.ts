import type { MetaAndAssetCtxsRequest } from "./meta.types";

const BASE_URL = "https://api.hyperliquid.xyz";

export enum MetaEndpointsKeys {
	GET_META_AND_ASSET_CTXS = "GET_META_AND_ASSET_CTXS",
}

export enum MetaEndpointsUrls {
	INFO = "info",
}

export const metaEndpoints = {
	/**
	 * POST /info - Get perpetuals asset contexts with funding rates
	 * @returns URL для запроса информации о перпетуальных контрактах
	 */
	getMetaAndAssetCtxs: (): string => {
		return `${BASE_URL}/${MetaEndpointsUrls.INFO}`;
	},
};

export const createMetaAndAssetCtxsRequest = (): MetaAndAssetCtxsRequest => ({
	type: "metaAndAssetCtxs",
});

export default metaEndpoints;
