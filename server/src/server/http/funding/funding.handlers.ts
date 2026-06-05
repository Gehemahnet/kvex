import type { IncomingMessage, ServerResponse } from "node:http";
import { getFunding } from "../../../services/funding/funding.service";
import { getFundingOverview } from "../../../services/funding/funding-overview.service";
import type { FundingOverviewResponse } from "../../../services/funding/funding-overview.types";
import type { FundingResponse } from "../../../services/funding/funding.types";
import { writeJsonResponse } from "../http-response.utils";
import { parseFundingOverviewQuery } from "../funding-overview-query";
import { parseFundingQuery } from "../funding-query";

/** Handles historical funding requests and writes a JSON response. */
export const getFundingHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseFundingQuery(request.url);
	const data: FundingResponse = await getFunding(query);

	writeJsonResponse(response, 200, data);
};

/** Handles funding overview requests and writes a JSON response. */
export const getFundingOverviewHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseFundingOverviewQuery(request.url);
	const data: FundingOverviewResponse = await getFundingOverview(query);

	writeJsonResponse(response, 200, data);
};
