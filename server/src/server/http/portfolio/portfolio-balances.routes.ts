import type { Route } from "../route.types";
import { getMyPortfolioBalancesHandler } from "./portfolio-balances.handlers";

export const portfolioBalanceRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/balances/me",
		handler: getMyPortfolioBalancesHandler,
	},
];
