import type { Route } from "../route.types";
import {
	createUserExchangeTokensHandler,
	deleteUserExchangeTokenHandler,
	listUserExchangeTokensHandler,
	updateUserExchangeTokenHandler,
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
		method: "PATCH",
		pathname: "/portfolio/exchange-tokens",
		handler: updateUserExchangeTokenHandler,
	},
	{
		method: "DELETE",
		pathname: "/portfolio/exchange-tokens",
		handler: deleteUserExchangeTokenHandler,
	},
];
