import type { IncomingMessage, ServerResponse } from "node:http";
import { getSpreads } from "../../../services/spreads/spreads.service";
import type { SpreadsResponse } from "../../../services/spreads/spreads.types";
import { writeJsonResponse } from "../http-response.utils";
import { parseSpreadsQuery } from "./spreads-query";

/** Handles `GET /spreads` and returns ranked spread opportunities. */
export const getSpreadsHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseSpreadsQuery(request.url);
	const data: SpreadsResponse = await getSpreads(query);

	writeJsonResponse(response, 200, data);
};
