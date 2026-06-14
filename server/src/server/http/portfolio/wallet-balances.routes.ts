import type { Route } from "../route.types";
import {
	getMyWalletBalancesHandler,
	getWalletBalancesHandler,
} from "./wallet-balances.handlers";

export const walletBalanceRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/wallet-balances",
		handler: getWalletBalancesHandler,
	},
	{
		method: "GET",
		pathname: "/portfolio/wallet-balances/me",
		handler: getMyWalletBalancesHandler,
	},
];
