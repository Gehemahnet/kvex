import type { Route } from "../route.types";
import { getWalletBalancesHandler } from "./wallet-balances.handlers";

export const walletBalanceRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/wallet-balances",
		handler: getWalletBalancesHandler,
	},
];
