import { Exchange, Period } from "../../common/types";

export type FundingPoint = {
	timestamp: number;
	fundingRate: number;
	nextFundingRate?: number;
};

export type FundingSeries = {
	exchange: Exchange;
	symbol: string;
	sourceSymbol: string;
	points: FundingPoint[];
	latest?: FundingPoint;
	isFundingAdapted: boolean;
	requestedTimeframe: Period;
	sourceTimeframe: Period;
};

export type FundingExchangeError = {
	exchange: Exchange;
	code: string;
	message: string;
};

export type FundingQuery = {
	symbol: string;
	timeframe: Period;
	exchanges: Exchange[];
};

export type FundingResponse = FundingQuery & {
	data: FundingSeries[];
	errors: FundingExchangeError[];
};
