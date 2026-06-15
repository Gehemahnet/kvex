import type { FundingQuery } from "#services/funding/funding-core/funding.types";
import { BadRequestError } from "./http-errors";
import {
	parseFundingExchanges,
	parseFundingSymbol,
	parseFundingTimeframe,
} from "./funding-query.utils";

/** Parse and validate the full funding query from an incoming request URL. */
export const parseFundingQuery = (requestUrl?: string): FundingQuery => {
	if (!requestUrl) {
		throw new BadRequestError("Request URL is required", "MISSING_REQUEST_URL");
	}

	const url = new URL(requestUrl, "http://localhost");

	return {
		symbol: parseFundingSymbol(url),
		timeframe: parseFundingTimeframe(url),
		exchanges: parseFundingExchanges(url),
	};
};
