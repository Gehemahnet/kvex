import type { Exchange, Period } from "../../common/types";
import type { FundingExchangeError } from "./funding.types";

export type FundingOverviewExchangeCell = {
	exchange: Exchange;
	sourceSymbol: string;
	fundingRate?: number;
	nextFundingRate?: number;
	apr?: number;
	timestamp?: number;
};

export type FundingOverviewRow = {
	symbol: string;
	exchanges: Partial<Record<Exchange, FundingOverviewExchangeCell>>;
};

export type FundingOverviewQuery = {
	timeframe: Period;
	exchanges: Exchange[];
};

export type FundingOverviewResponse = FundingOverviewQuery & {
	data: FundingOverviewRow[];
	errors: FundingExchangeError[];
};
