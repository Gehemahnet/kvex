export type FundingExchange =
	| "hyperliquid"
	| "pacifica"
	| "ethereal"
	| "nado"
	| "okx"
	| "variational";

export type FundingTimeframe = "DAY" | "WEEK" | "MONTH" | "YEAR";

export type FundingPoint = {
	timestamp: number;
	fundingRate: number;
	nextFundingRate?: number;
};

export type FundingSeries = {
	exchange: FundingExchange;
	symbol: string;
	sourceSymbol: string;
	points: FundingPoint[];
	latest?: FundingPoint;
	isFundingAdapted: boolean;
	requestedTimeframe: FundingTimeframe;
	sourceTimeframe: FundingTimeframe;
};

export type FundingExchangeError = {
	exchange: FundingExchange;
	code: string;
	message: string;
};

export type FundingResponse = {
	symbol: string;
	timeframe: FundingTimeframe;
	exchanges: FundingExchange[];
	data: FundingSeries[];
	errors: FundingExchangeError[];
};

export type FundingOverviewExchangeCell = {
	exchange: FundingExchange;
	sourceSymbol: string;
	fundingRate?: number;
	nextFundingRate?: number;
	fundingIntervalHours?: number;
	bidPrice?: number;
	askPrice?: number;
	bidSize?: number;
	askSize?: number;
	apr?: number;
	timestamp?: number;
};

export type FundingOverviewRow = {
	symbol: string;
	exchanges: Partial<Record<FundingExchange, FundingOverviewExchangeCell>>;
};

export type FundingOverviewResponse = {
	timeframe: FundingTimeframe;
	exchanges: FundingExchange[];
	data: FundingOverviewRow[];
	errors: FundingExchangeError[];
};
