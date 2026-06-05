import type { FundingOverviewQuery } from "../../services/funding/funding-overview.types";
import { BadRequestError } from "./http-errors";
import {
	parseFundingExchanges,
	parseFundingTimeframe,
} from "./funding-query.utils";

/** Parses and validates query parameters for the funding overview endpoint. */
export const parseFundingOverviewQuery = (
	requestUrl?: string,
): FundingOverviewQuery => {
	if (!requestUrl) {
		throw new BadRequestError("Request URL is required", "MISSING_REQUEST_URL");
	}

	const url = new URL(requestUrl, "http://localhost");

	return {
		timeframe: parseFundingTimeframe(url),
		exchanges: parseFundingExchanges(url),
	};
};
