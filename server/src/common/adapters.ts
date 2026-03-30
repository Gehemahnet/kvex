export type MarketsAdapter<InputData, AdaptedData> = {
	adapt(data: InputData): AdaptedData;
};

type MarketSnapshot = {
	exchange: string;
	symbol: string;
	timestamp: number;

	markPrice: number;
	oraclePrice: number;
	bidPrice: number;
	askPrice: number;
	midPrice: number;

	fundingRate: number;
	nextFundingRate?: number;

	openInterest?: number;
	volume24h?: number;

	makerFee: number;
	takerFee: number;

	spread: number;
};

type HistoricalPoint = {
	timestamp: number;
	symbol: string;
	markPrice: number;
	fundingRate: number;
	openInterest?: number;
	volume24h?: number;
};

export type Position = {
	entryPrice: number;
	size: number;
	side: "long" | "short";
	fundingPnL: number;
	tradingPnL: number;
	fees: number;
};
