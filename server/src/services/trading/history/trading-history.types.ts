import type { Exchange } from "#common/types";

export type TradingHistoryPosition = {
	accountId: string;
	closedAt: string;
	entryPrice: string;
	exchange: Exchange;
	exitPrice: string;
	id: string;
	openedAt: string;
	quoteAsset: "USD" | "USDC" | "USDT" | "USDT0";
	realizedPnlUsd?: string;
	side: "long" | "short";
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
	code: "TRADING_HISTORY_FETCH_FAILED";
	exchange: Exchange;
	label: string;
	message: string;
};
