import type {
	GetBBOParams,
	GetFundingDataParams,
	GetImpactPriceParams,
	GetKlinesParams,
	GetMarketsParams,
	GetMarketsSummaryParams,
	GetOrderbookInteractiveParams,
	GetOrderbookParams,
} from "./markets.types";

const BASE_URL = "https://api.prod.paradex.trade/v1";

export enum MarketEndpointsKeys {
	GET_BBO = "GET_BBO",
	GET_FUNDING_DATA = "GET_FUNDING_DATA",
	GET_MARKETS = "GET_MARKETS",
	GET_KLINE = "GET_KLINE",
	GET_MARKETS_SUMMARY = "GET_MARKETS_SUMMARY",
	GET_ORDERBOOK = "GET_ORDERBOOK",
	GET_IMPACT_PRICE = "GET_IMPACT_PRICE",
	GET_ORDERBOOK_INTERACTIVE = "GET_ORDERBOOK_INTERACTIVE",
}

export enum MarketEndpointsUrls {
	GET_BBO = "bbo",
	GET_FUNDING_DATA = "funding/data",
	GET_MARKETS = "markets",
	GET_KLINE = "markets/klines",
	GET_MARKETS_SUMMARY = "markets/summary",
	GET_ORDERBOOK = "orderbook",
	GET_IMPACT_PRICE = "orderbook/impact-price",
	GET_ORDERBOOK_INTERACTIVE = "orderbook/interactive",
}

export const marketsEndpoints = {
	/**
	 * GET /api/v1/bbo/{market} - Get the best bid/ask for the given market
	 * @param params - Параметры запроса
	 * @returns URL для запроса лучшего бида и аска
	 */
	getBBO: (params: GetBBOParams): string => {
		return `${BASE_URL}/${MarketEndpointsUrls.GET_BBO}/${params.market}`;
	},

	/**
	 * GET /api/v1/funding/data - List historical funding data by market
	 * @param params - Параметры запроса
	 * @returns URL для запроса исторических данных по funding
	 */
	getFundingData: (params: GetFundingDataParams): string => {
		const query = new URLSearchParams({ market: params.market });

		if (params.cursor !== undefined) {
			query.append("cursor", params.cursor);
		}

		if (params.end_at !== undefined) {
			query.append("end_at", params.end_at.toString());
		}

		if (params.page_size !== undefined) {
			query.append("page_size", params.page_size.toString());
		}

		if (params.start_at !== undefined) {
			query.append("start_at", params.start_at.toString());
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_FUNDING_DATA}?${query}`;
	},

	/**
	 * GET /api/v1/markets - Get markets static data component
	 * @param params - Параметры запроса
	 * @returns URL для запроса информации о рынках
	 */
	getMarkets: (params?: GetMarketsParams): string => {
		if (!params?.market) {
			return `${BASE_URL}/${MarketEndpointsUrls.GET_MARKETS}`;
		}

		const query = new URLSearchParams({ market: params.market });
		return `${BASE_URL}/${MarketEndpointsUrls.GET_MARKETS}?${query}`;
	},

	/**
	 * GET /api/v1/markets/klines - Klines for a symbol
	 * @param params - Параметры запроса
	 * @returns URL для запроса свечных данных
	 */
	getKlines: (params: GetKlinesParams): string => {
		const query = new URLSearchParams({
			symbol: params.symbol,
			resolution: params.resolution,
			start_at: params.start_at.toString(),
			end_at: params.end_at.toString(),
		});

		if (params.price_kind !== undefined) {
			query.append("price_kind", params.price_kind);
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_KLINE}?${query}`;
	},

	/**
	 * GET /api/v1/markets/summary - Get markets dynamic data component
	 * @param params - Параметры запроса
	 * @returns URL для запроса сводки по рынкам
	 */
	getMarketsSummary: (params: GetMarketsSummaryParams): string => {
		const query = new URLSearchParams({ market: params.market });

		if (params.end !== undefined) {
			query.append("end", params.end.toString());
		}

		if (params.start !== undefined) {
			query.append("start", params.start.toString());
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_MARKETS_SUMMARY}?${query}`;
	},

	/**
	 * GET /api/v1/orderbook/{market} - Get snapshot of the orderbook for the given market
	 * @param params - Параметры запроса
	 * @returns URL для запроса стакана заказов
	 */
	getOrderbook: (params: GetOrderbookParams): string => {
		const query = new URLSearchParams();

		if (params.depth !== undefined) {
			query.append("depth", params.depth.toString());
		}

		if (params.price_tick !== undefined) {
			query.append("price_tick", params.price_tick);
		}

		const queryString = query.toString();
		return `${BASE_URL}/${MarketEndpointsUrls.GET_ORDERBOOK}/${params.market}${queryString ? `?${queryString}` : ""}`;
	},

	/**
	 * GET /api/v1/orderbook/{market}/impact-price - Get market impact price
	 * @param params - Параметры запроса
	 * @returns URL для запроса цены с учетом влияния на рынок
	 */
	getImpactPrice: (params: GetImpactPriceParams): string => {
		const query = new URLSearchParams({
			size: params.size.toString(),
		});

		return `${BASE_URL}/${MarketEndpointsUrls.GET_ORDERBOOK}/${params.market}/${MarketEndpointsUrls.GET_IMPACT_PRICE}?${query}`;
	},

	/**
	 * GET /api/v1/orderbook/{market}/interactive - Returns orderbook including RPI
	 * @param params - Параметры запроса
	 * @returns URL для запроса интерактивного стакана заказов
	 */
	getOrderbookInteractive: (params: GetOrderbookInteractiveParams): string => {
		const query = new URLSearchParams();

		if (params.depth !== undefined) {
			query.append("depth", params.depth.toString());
		}

		if (params.price_tick !== undefined) {
			query.append("price_tick", params.price_tick);
		}

		const queryString = query.toString();
		return `${BASE_URL}/${MarketEndpointsUrls.GET_ORDERBOOK}/${params.market}/${MarketEndpointsUrls.GET_ORDERBOOK_INTERACTIVE}${queryString ? `?${queryString}` : ""}`;
	},
};

export default marketsEndpoints;
