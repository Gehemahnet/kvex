import type { Route } from "../route.types";
import {
	createUserExchangeTokensHandler,
	deleteUserExchangeTokenHandler,
	listUserExchangeTokensHandler,
} from "./user-exchange-tokens.handlers";

export const userExchangeTokenRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/exchange-tokens",
		handler: listUserExchangeTokensHandler,
	},
	{
		method: "POST",
		pathname: "/portfolio/exchange-tokens",
		handler: createUserExchangeTokensHandler,
	},
	{
		method: "DELETE",
		pathname: "/portfolio/exchange-tokens",
		handler: deleteUserExchangeTokenHandler,
	},
];
