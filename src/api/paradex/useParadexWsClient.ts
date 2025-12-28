import { type ComputedRef, ref } from "vue";
import type { SnakeToCamelObject } from "../../types";

type ParadexWsMessage = {
	id?: number;
	jsonrpc: "2.0";
	method: "subscription";
	params?: {
		channel: string;
		data: MarketSummaryResponse;
	};
	usDiff?: number;
	usIn?: number;
	usOut?: number;
};

type MarketSummaryResponse = {
	ask: string;
	/** Подразумеваемая волатильность для продажи */
	ask_iv: string;
	/** Цена покупки */
	bid: string;
	/** Подразумеваемая волатильность для покупки */
	bid_iv: string;
	/** Время создания записи */
	created_at: number;
	/** Дельта (для опционов) */
	delta: string;
	/** Текущая ставка финансирования */
	funding_rate: string;
	/** Будущая ставка финансирования */
	future_funding_rate: string;
	/** Греки (для опционов) */
	greeks: GreeksWebSocket;
	/** Последняя подразумеваемая волатильность */
	last_iv: string;
	/** Цена последней сделки */
	last_traded_price: string;
	/** Подразумеваемая волатильность маркировочной цены */
	mark_iv: string;
	/** Маркировочная цена */
	mark_price: string;
	/** Открытый интерес */
	open_interest: string;
	/** 24-часовое изменение цены в процентах */
	price_change_rate_24h: string;
	/** Символ рынка */
	symbol: string;
	/** Общий объем */
	total_volume: string;
	/** Цена базового актива */
	underlying_price: string;
	/** 24-часовой объем */
	volume_24h: string;
};

export interface GreeksWebSocket {
	/** Дельта */
	delta: string;
	/** Гамма */
	gamma: string;
	/** Ро */
	rho: string;
	/** Ванна */
	vanna: string;
	/** Вега */
	vega: string;
	/** Вольга */
	volga: string;
}

export type FundingDataResult = {
	/** Created timestamp */
	created_at: number;
	/** Funding index */
	funding_index: string;
	/** Funding period in hours */
	funding_period_hours: number;
	/** Funding premium */
	funding_premium: string;
	/** Funding rate */
	funding_rate: string;
	/** 8-hour funding rate */
	funding_rate_8h: string;
	/** Market symbol */
	market: string;
};

export const CHANNELS = {
	MARKETS_CHANNEL: "markets_summary",
	FUNDING_DATA: "funding_data",
};

const createSubscription = (
	connection: WebSocket,
	{
		id,
		channel,
	}: { id: number; channel: (typeof CHANNELS)[keyof typeof CHANNELS] },
) => {
	connection.send(
		JSON.stringify({
			id,
			jsonrpc: "2.0",
			method: "subscribe",
			channel,
		}),
	);
};
export const useParadexWsClient = ({
	relatedMarkets,
}: {
	relatedMarkets: ComputedRef<Set<string>>;
}) => {
	const marketsData = ref(
		Object.fromEntries(
			Array.from(relatedMarkets.value).map((key) => [key, undefined]),
		),
	);

	const messageHandler = (e: MessageEvent<string>) => {
		const { params } = JSON.parse(e.data) as ParadexWsMessage;
		if (!params) return;

		if (
			params.channel === CHANNELS.MARKETS_CHANNEL &&
			params.data.symbol.includes("USD-PERP")
		) {
			console.log("Paradex message:", params.data);

			const tokenSymbol = params.data.symbol.split("-")[0];
			if (!tokenSymbol) return;
			marketsData.value[tokenSymbol] = marketTokenDataAdapter(params.data);
		}
	};

	const BASE_URL = "wss://ws.api.prod.paradex.trade/v1";

	const connection = new WebSocket(BASE_URL);
	connection.onopen = () => {
		console.log("Connection to Paradex opened");
		// createSubscription(connection, {
		// 	id: 0,
		// 	channel: CHANNELS.MARKETS_CHANNEL,
		// });
		createSubscription(connection, {
			id: 1,
			channel: CHANNELS.FUNDING_DATA,
		});
	};
	connection.onclose = () => {
		console.log("Connection to Paradex closed");
	};
	connection.onerror = (e) => {
		console.error(e);
	};
	connection.onmessage = messageHandler;

	return { marketsData };
};

const marketTokenDataAdapter = (
	rawData: MarketSummaryResponse,
): SnakeToCamelObject<
	Pick<MarketSummaryResponse, "mark_price" | "funding_rate">
> => ({
	markPrice: rawData.mark_price,
	fundingRate: rawData.funding_rate,
});
