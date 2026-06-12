import type { Route } from "../route.types";
import { getAssetPricesHandler } from "./asset-prices.handlers";

export const assetPriceRoutes: Route[] = [
	{
		method: "GET",
		pathname: "/portfolio/prices",
		handler: getAssetPricesHandler,
	},
];
