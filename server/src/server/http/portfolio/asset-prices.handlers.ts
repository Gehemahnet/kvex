import type { IncomingMessage, ServerResponse } from "node:http";
import { getAssetPrices } from "#services/portfolio/asset-prices/asset-prices.service";
import type { AssetPricesResponse } from "#services/portfolio/asset-prices/asset-prices.types";
import { writeJsonResponse } from "../http-response.utils";
import { parseAssetPricesQuery } from "./asset-prices-query";

/** Handles `GET /portfolio/prices` for best-effort USD portfolio pricing. */
export const getAssetPricesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseAssetPricesQuery(request.url);
	const data: AssetPricesResponse = await getAssetPrices(query);

	writeJsonResponse(response, 200, data);
};
