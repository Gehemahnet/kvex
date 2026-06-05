import type { Route } from "../route.types";
import { getSpreadsHandler } from "./spreads.handlers";

export const spreadRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/spreads",
		handler: getSpreadsHandler,
	},
];
