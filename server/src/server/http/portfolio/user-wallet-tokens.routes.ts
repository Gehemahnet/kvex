import type { Route } from "../route.types";
import {
	createUserWalletTokenHandler,
	deleteUserWalletTokenHandler,
	listUserWalletTokensHandler,
} from "./user-wallet-tokens.handlers";

export const userWalletTokenRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/tokens",
		handler: listUserWalletTokensHandler,
	},
	{
		method: "POST",
		pathname: "/portfolio/tokens",
		handler: createUserWalletTokenHandler,
	},
	{
		method: "DELETE",
		pathname: "/portfolio/tokens",
		handler: deleteUserWalletTokenHandler,
	},
];
