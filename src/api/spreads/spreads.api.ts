import { apiGet } from "../api-client";
import type { FundingExchange } from "../funding/funding.types";
import type { SpreadsResponse } from "./spreads.types";

export type SpreadsRequestParams = {
	exchanges: FundingExchange[];
	symbol?: string;
	minPriceSpreadPercent?: number;
	maxSnapshotAgeMs?: number;
	positionSizeUsd?: number;
	minOccurrences?: number;
	minLifetimeMs?: number;
	holdingPeriodHours?: number;
};

export const spreadsApi = {
	/** Builds a stable REST URL for a spreads request. */
	createUrl: (params: SpreadsRequestParams): string => {
		const query = createSpreadsSearchParams(params);
		const queryString = query.toString();

		return queryString ? `/api/spreads?${queryString}` : "/api/spreads";
	},

	/** Fetches spread opportunities from the public REST endpoint. */
	getSpreads: (params: SpreadsRequestParams): Promise<SpreadsResponse> =>
		apiGet<SpreadsResponse>(spreadsApi.createUrl(params)),
};

const createSpreadsSearchParams = (
	params: SpreadsRequestParams,
): URLSearchParams => {
	const query = new URLSearchParams();

	setListParam(query, "exchanges", params.exchanges);
	setStringParam(query, "symbol", params.symbol);
	setNumberParam(query, "minPriceSpreadPercent", params.minPriceSpreadPercent);
	setNumberParam(query, "maxSnapshotAgeMs", params.maxSnapshotAgeMs);
	setPositiveNumberParam(query, "positionSizeUsd", params.positionSizeUsd);
	setPositiveIntegerParam(query, "minOccurrences", params.minOccurrences);
	setPositiveNumberParam(query, "minLifetimeMs", params.minLifetimeMs);
	setPositiveNumberParam(query, "holdingPeriodHours", params.holdingPeriodHours);

	return query;
};

const setListParam = (
	query: URLSearchParams,
	key: string,
	values: string[],
): void => {
	if (values.length > 0) {
		query.set(key, values.join(","));
	}
};

const setStringParam = (
	query: URLSearchParams,
	key: string,
	value?: string,
): void => {
	const normalizedValue = value?.trim();

	if (normalizedValue) {
		query.set(key, normalizedValue);
	}
};

const setNumberParam = (
	query: URLSearchParams,
	key: string,
	value?: number,
): void => {
	if (value !== undefined) {
		query.set(key, String(value));
	}
};

const setPositiveNumberParam = (
	query: URLSearchParams,
	key: string,
	value?: number,
): void => {
	if (value !== undefined && value > 0) {
		query.set(key, String(value));
	}
};

const setPositiveIntegerParam = (
	query: URLSearchParams,
	key: string,
	value?: number,
): void => {
	if (value !== undefined && value > 0) {
		query.set(key, String(Math.floor(value)));
	}
};
