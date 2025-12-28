import type {
	GetCandleParams,
	GetFundingHistoryParams,
	GetRecentTradesParams,
	OrderbookParams,
} from "./markets.types";

const BASE_URL = "https://api.pacifica.fi/api/v1";

export enum MarketEndpointsKeys {
	GET_MARKET_INFO = "GET_MARKET_INFO",
	GET_PRICES = "GET_PRICES",
	GET_CANDLE = "GET_CANDLE",
	GET_MARK_PRICE_CANDLE = "GET_MARK_PRICE_CANDLE",
	GET_ORDERBOOK = "GET_ORDERBOOK",
	GET_RECENT_TRADES = "GET_RECENT_TRADES",
	GET_HISTORICAL_FUNDING = "GET_HISTORICAL_FUNDING",
}

export enum MarketEndpointsUrls {
	GET_MARKET_INFO = "info",
	GET_PRICES = "info/prices",
	GET_CANDLE = "kline",
	GET_MARK_PRICE_CANDLE = "kline/mark",
	GET_ORDERBOOK = "book",
	GET_RECENT_TRADES = "trades",
	GET_HISTORICAL_FUNDING = "funding_rate/history",
}

export const marketsEndpoints = {
	/**
	 * GET /api/v1/info - Получение информации о рынках
	 * @returns URL для запроса информации о рынках
	 */
	getMarketInfo: (): string => {
		return `${BASE_URL}/${MarketEndpointsUrls.GET_MARKET_INFO}`;
	},

	/**
	 * GET /api/v1/kline - Получение свечных данных
	 * @param params - Параметры запроса
	 * @returns URL для запроса свечных данных
	 */
	getCandle: (params: GetCandleParams): string => {
		const query = new URLSearchParams({
			symbol: params.symbol,
			interval: params.interval,
			start_time: params.start_time.toString(),
		});

		if (params.end_time !== undefined) {
			query.append("end_time", params.end_time.toString());
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_CANDLE}?${query}`;
	},

	/**
	 * GET /api/v1/kline/mark - Получение свечей mark price
	 * @param params - Параметры запроса
	 * @returns URL для запроса свечей mark price
	 */
	getMarkPriceCandle: (params: GetCandleParams): string => {
		const query = new URLSearchParams({
			symbol: params.symbol,
			interval: params.interval,
			start_time: params.start_time.toString(),
		});

		if (params.end_time !== undefined) {
			query.append("end_time", params.end_time.toString());
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_MARK_PRICE_CANDLE}?${query}`;
	},

	/**
	 * GET /api/v1/info/prices - Получение цен
	 * @returns URL для запроса цен
	 */
	getPrices: (): string => {
		return `${BASE_URL}/${MarketEndpointsUrls.GET_PRICES}`;
	},

	/**
	 * GET /api/v1/book - Получение стакана заказов
	 * @param params - Параметры запроса
	 * @returns URL для запроса стакана заказов
	 */
	getOrderbook: (params: OrderbookParams): string => {
		const query = new URLSearchParams({ symbol: params.symbol });

		if (params.agg_level !== undefined) {
			query.append("agg_level", params.agg_level.toString());
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_ORDERBOOK}?${query}`;
	},

	/**
	 * GET /api/v1/trades - Получение последних сделок
	 * @param params - Параметры запроса
	 * @returns URL для запроса последних сделок
	 */
	getRecentTrades: (params: GetRecentTradesParams): string => {
		const query = new URLSearchParams({ symbol: params.symbol });
		return `${BASE_URL}/${MarketEndpointsUrls.GET_RECENT_TRADES}?${query}`;
	},

	/**
	 * GET /api/v1/funding_rate/history - Исторические данные по funding rate
	 * @param params - Параметры запроса
	 * @returns URL для запроса исторических данных по funding rate
	 */
	getFundingRateHistory: (params: GetFundingHistoryParams): string => {
		const query = new URLSearchParams({ symbol: params.symbol });

		if (params.limit !== undefined) {
			query.append("limit", params.limit.toString());
		}

		if (params.cursor !== undefined) {
			query.append("cursor", params.cursor);
		}

		return `${BASE_URL}/${MarketEndpointsUrls.GET_HISTORICAL_FUNDING}?${query}`;
	},
};

export default marketsEndpoints;
