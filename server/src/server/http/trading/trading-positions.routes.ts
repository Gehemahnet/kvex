import type { Route } from "../route.types";
import { getMyTradingHistoryHandler, getMyTradingPositionsHandler } from "./trading-positions.handlers";

export const tradingPositionRoutes: Route[] = [{
	method: "GET",
	pathname: "/trading/positions/me",
	handler: getMyTradingPositionsHandler,
}, {
	method: "GET",
	pathname: "/trading/history/me",
	handler: getMyTradingHistoryHandler,
}];
