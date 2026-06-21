import { apiGet } from "../api-client";
import type { TradingHistoryResponse, TradingPositionsResponse } from "./trading.types";

export const tradingApi = {
	/** Fetches normalized open positions from the current user's exchange accounts. */
	getUserPositions: (): Promise<TradingPositionsResponse> =>
		apiGet<TradingPositionsResponse>("/api/trading/positions/me"),
	getUserHistory: (): Promise<TradingHistoryResponse> =>
		apiGet<TradingHistoryResponse>("/api/trading/history/me"),
};
