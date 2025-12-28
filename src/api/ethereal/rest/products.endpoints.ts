import type {
	GetProductByIdParamsDto,
	GetProductsQueryDto,
} from "./products.types";

/**
 * BASE из ethereal.openapi.json
 */
const BASE_URL = "https://api.ethereal.trade/v1/product";

export enum ProductEndpointsKeys {
	GET_PRODUCTS = "GET_PRODUCTS",
	GET_PRODUCT_BY_ID = "GET_PRODUCT_BY_ID",
	GET_MARKET_PRICE = "GET_MARKET_PRICE",
	GET_MARKET_LIQUIDITY = "GET_MARKET_LIQUIDITY",
}

export enum ProductEndpointsUrls {
	GET_PRODUCTS = "",
	GET_PRODUCT_BY_ID = "{id}",
	GET_MARKET_PRICE = "market-price",
	GET_MARKET_LIQUIDITY = "market-liquidity",
}

export const productEndpoints = {
	/**
	 * GET /v1/product
	 */
	getProducts: (params?: GetProductsQueryDto): string => {
		const query = new URLSearchParams();

		if (params?.limit !== undefined) {
			query.append("limit", params.limit.toString());
		}

		if (params?.cursor !== undefined) {
			query.append("cursor", params.cursor);
		}

		const qs = query.toString();
		return qs ? `${BASE_URL}?${qs}` : BASE_URL;
	},

	/**
	 * GET /v1/product/{id}
	 */
	getProductById: ({ id }: GetProductByIdParamsDto): string => {
		return `${BASE_URL}/${id}`;
	},

	/**
	 * GET /v1/product/market-price
	 */
	getMarketPrice: (): string => {
		return `${BASE_URL}/${ProductEndpointsUrls.GET_MARKET_PRICE}`;
	},

	/**
	 * GET /v1/product/market-liquidity
	 */
	getMarketLiquidity: (): string => {
		return `${BASE_URL}/${ProductEndpointsUrls.GET_MARKET_LIQUIDITY}`;
	},
};

export default productEndpoints;
