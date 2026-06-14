import type { Route } from "../route.types";
import {
	createUserPortfolioSourceHandler,
	deleteUserPortfolioSourceHandler,
	listUserPortfolioSourcesHandler,
	updateUserPortfolioSourceHandler,
} from "./user-portfolio-sources.handlers";

export const userPortfolioSourceRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/sources",
		handler: listUserPortfolioSourcesHandler,
	},
	{
		method: "POST",
		pathname: "/portfolio/sources",
		handler: createUserPortfolioSourceHandler,
	},
	{
		method: "PATCH",
		pathname: "/portfolio/sources",
		handler: updateUserPortfolioSourceHandler,
	},
	{
		method: "DELETE",
		pathname: "/portfolio/sources",
		handler: deleteUserPortfolioSourceHandler,
	},
];
