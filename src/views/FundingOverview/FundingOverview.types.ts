export type FundingExchange = "hyperliquid" | "pacifica" | "ethereal";

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

export type FundingTableRow = {
	exchange: FundingExchange;
	symbol: string;
	sourceSymbol: string;
	fundingRate?: number;
	nextFundingRate?: number;
	timestamp?: number;
	pointsCount: number;
	isFundingAdapted: boolean;
	requestedTimeframe: FundingTimeframe;
	sourceTimeframe: FundingTimeframe;
};

