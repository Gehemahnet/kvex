import { useQuery } from "@tanstack/vue-query";
import { tradingApi } from "@api/trading/trading.api";

export const USER_TRADING_POSITIONS_QUERY_KEY = [
	"trading",
	"positions",
	"me",
] as const;

export const USER_TRADING_HISTORY_QUERY_KEY = ["trading", "history", "me"] as const;

/** Fetches current-user positions and periodically refreshes the read-only terminal. */
export const useUserTradingPositionsQuery = () =>
	useQuery({
		queryKey: USER_TRADING_POSITIONS_QUERY_KEY,
		queryFn: () => tradingApi.getUserPositions(),
		refetchInterval: 5_000,
		retry: false,
		staleTime: 4_000,
	});

/** Fetches the current user's normalized closed-position history. */
export const useUserTradingHistoryQuery = () =>
	useQuery({
		queryKey: USER_TRADING_HISTORY_QUERY_KEY,
		queryFn: () => tradingApi.getUserHistory(),
		refetchInterval: 30_000,
		retry: false,
		staleTime: 15_000,
	});
