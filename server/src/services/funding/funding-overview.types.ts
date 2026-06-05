import type { Exchange, Period } from "../../common/types";
import type { FundingExchangeError } from "./funding.types";

export type FundingOverviewExchangeCell = {
	exchange: Exchange;
	sourceSymbol: string;
	fundingRate?: number;
	nextFundingRate?: number;
	fundingIntervalHours?: number;
	apr?: number;
	bidPrice?: number;
	askPrice?: number;
	bidSize?: number;
	askSize?: number;
	markPrice?: number;
	indexPrice?: number;
	midPrice?: number;
	openInterest?: number;
	volume24h?: number;
	makerFeeRate?: number;
	takerFeeRate?: number;
	feeSource?: "api" | "documentation";
	maxLeverage?: number;
	minOrderSize?: number;
	maxOrderSize?: number;
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

export type FundingOverviewExchangeCellsResponse = {
	exchanges: Exchange[];
	data: FundingOverviewExchangeCell[];
	errors: FundingExchangeError[];
};
