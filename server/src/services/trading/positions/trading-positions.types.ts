import type { Exchange } from "#common/types";

export type TradingPositionSide = "long" | "short";

export type TradingPosition = {
	id: string;
	accountId: string;
	exchange: Exchange;
	label: string;
	symbol: string;
	sourceSymbol: string;
	quoteAsset: "USD" | "USDC" | "USDT" | "USDT0";
	side: TradingPositionSide;
	size: string;
	entryPrice?: string;
	markPrice?: string;
	liquidationPrice?: string;
	leverage?: number;
	marginMode?: "cross" | "isolated";
	marginUsed?: string;
	notionalUsd?: string;
	unrealizedPnlUsd?: string;
	returnOnEquity?: number;
	updatedAt?: string;
};

export type TradingPositionError = {
	accountId: string;
	exchange: Exchange;
	label: string;
	code:
		| "TRADING_POSITIONS_CREDENTIALS_REQUIRED"
		| "TRADING_POSITIONS_FETCH_FAILED"
		| "TRADING_POSITIONS_UNSUPPORTED";
	message: string;
};

export type TradingPositionsResponse = {
	positions: TradingPosition[];
	errors: TradingPositionError[];
};
