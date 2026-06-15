import type { Exchange } from "#common/types";

export type UserExchangeBalanceAsset = {
	asset: string;
	available?: string;
	equity?: string;
	hold?: string;
	total?: string;
	valueUsd?: number;
};

export type UserExchangeBalanceErrorCode =
	| "EXCHANGE_BALANCE_CREDENTIALS_REQUIRED"
	| "EXCHANGE_BALANCE_FETCH_FAILED"
	| "EXCHANGE_BALANCE_UNSUPPORTED"
	| "EXCHANGE_TOKEN_EXPIRED"
	| "EXCHANGE_TOKEN_EXPIRY_INVALID";

export type UserExchangeBalanceError = {
	accountId: string;
	code: UserExchangeBalanceErrorCode;
	exchange: Exchange;
	message: string;
};

export type UserExchangeBalanceResult = {
	accountId: string;
	exchange: Exchange;
	label: string;
	assets: UserExchangeBalanceAsset[];
	totalValueUsd?: number;
	updatedAt?: string;
};

export type UserExchangeBalancesResponse = {
	balances: UserExchangeBalanceResult[];
	errors: UserExchangeBalanceError[];
};
