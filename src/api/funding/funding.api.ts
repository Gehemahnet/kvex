import { apiGet, createApiUrl } from "../api-client";
import type {
	FundingExchange,
	FundingOverviewResponse,
	FundingTimeframe,
} from "./funding.types";

export type FundingOverviewRequestParams = {
	timeframe: FundingTimeframe;
	exchanges: FundingExchange[];
};

export const fundingApi = {
	/** Fetches the funding overview endpoint with timeframe and exchange filters. */
	getOverview: (
		params: FundingOverviewRequestParams,
	): Promise<FundingOverviewResponse> =>
		apiGet<FundingOverviewResponse>(
			createApiUrl("/api/funding/overview", {
				exchanges: params.exchanges,
				timeframe: params.timeframe,
			}),
		),
};
