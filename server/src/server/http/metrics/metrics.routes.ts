import type { Route } from "../route.types";
import { getMetricsHandler } from "./metrics.handlers";

export const metricsRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/metrics",
		handler: getMetricsHandler,
	},
];
