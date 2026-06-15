import type { IncomingMessage, ServerResponse } from "node:http";
import { getMarketSnapshots } from "#services/markets/market-snapshots/market-snapshots.service";
import type { MarketSnapshotsResponse } from "#services/markets/market-snapshots/market-snapshots.types";
import { writeJsonResponse } from "../http-response.utils";
import { parseMarketSnapshotsQuery } from "./market-snapshots-query";

/** Handles `GET /markets/snapshots` and returns normalized market snapshots. */
export const getMarketSnapshotsHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseMarketSnapshotsQuery(request.url);
	const data: MarketSnapshotsResponse = await getMarketSnapshots(query);

	writeJsonResponse(response, 200, data);
};
