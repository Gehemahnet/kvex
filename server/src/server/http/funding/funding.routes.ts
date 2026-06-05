import type { Route } from "../route.types";
import {
	getFundingHandler,
	getFundingOverviewHandler,
} from "./funding.handlers";

export const fundingRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/funding",
		handler: getFundingHandler,
	},
	{
		method: "GET",
		pathname: "/funding/overview",
		handler: getFundingOverviewHandler,
	},
];
