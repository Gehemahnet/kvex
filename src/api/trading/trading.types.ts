export type TradingPositionSide = "long" | "short";

export type TradingPosition = {
	id: string;
	accountId: string;
	exchange: string;
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
	exchange: string;
	label: string;
	code: string;
	message: string;
};

export type TradingPositionsResponse = {
	positions: TradingPosition[];
	errors: TradingPositionError[];
};

export type TradingHistoryPosition = {
	accountId: string;
	closedAt: string;
	entryPrice: string;
	exchange: string;
	exitPrice: string;
	id: string;
	openedAt: string;
	quoteAsset: "USD" | "USDC" | "USDT" | "USDT0";
	realizedPnlUsd?: string;
	side: TradingPositionSide;
	size: string;
	sourceSymbol: string;
	symbol: string;
};

export type TradingHistoryResponse = {
	errors: TradingHistoryError[];
	positions: TradingHistoryPosition[];
};

export type TradingHistoryError = {
	accountId: string;
	code: string;
	exchange: string;
	label: string;
	message: string;
};
