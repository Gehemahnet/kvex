import type {
	FundingExchange,
	FundingResponse,
	FundingTimeframe,
} from "./FundingOverview.types";

type FundingRequestParams = {
	symbol: string;
	timeframe: FundingTimeframe;
	exchanges: FundingExchange[];
};

export const getFunding = async (
	params: FundingRequestParams,
): Promise<FundingResponse> => {
	const query = new URLSearchParams({
		symbol: params.symbol,
		timeframe: params.timeframe,
	});

	if (params.exchanges.length > 0) {
		query.set("exchanges", params.exchanges.join(","));
	}

	const response = await fetch(`/funding?${query.toString()}`);

	if (!response.ok) {
		const body = await response.json().catch(() => undefined) as
			| { error?: { message?: string } }
			| undefined;

		throw new Error(body?.error?.message ?? `Funding request failed: ${response.status}`);
	}

	return response.json() as Promise<FundingResponse>;
};

