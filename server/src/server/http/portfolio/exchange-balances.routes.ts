import type { Route } from "../route.types";
import { getMyExchangeBalancesHandler } from "./exchange-balances.handlers";

export const exchangeBalanceRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/exchange-balances/me",
		handler: getMyExchangeBalancesHandler,
	},
];
