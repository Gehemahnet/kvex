import { ALL_PERIODS } from "../../common/constants";
import { Exchange, Period } from "../../common/types";
import {
	SUPPORTED_FUNDING_EXCHANGES,
} from "../../services/funding/funding.constants";
import { BadRequestError } from "./http-errors";

/** Check whether a string matches one of the supported funding exchanges. */
export const isFundingExchange = (value: string): value is Exchange =>
	SUPPORTED_FUNDING_EXCHANGES.includes(value as Exchange);

/** Check whether a string matches one of the supported period values. */
export const isFundingPeriod = (value: string): value is Period =>
	ALL_PERIODS.includes(value as Period);

/** Read a required query parameter and normalize it before returning. */
export const getRequiredQueryParam = (
	url: URL,
	key: string,
	errorCode: string,
	normalize: (value: string) => string = (value) => value,
): string => {
	const value = url.searchParams.get(key)?.trim();

	if (!value) {
		throw new BadRequestError(
			`Query param \`${key}\` is required`,
			errorCode,
		);
	}

	return normalize(value);
};

/** Parse and validate the funding timeframe query parameter. */
export const parseFundingTimeframe = (url: URL): Period => {
	const timeframe = getRequiredQueryParam(
		url,
		"timeframe",
		"MISSING_TIMEFRAME",
		(value) => value.toUpperCase(),
	);

	if (!isFundingPeriod(timeframe)) {
		throw new BadRequestError(
			"Query param `timeframe` must be one of DAY,WEEK,MONTH,YEAR",
			"INVALID_TIMEFRAME",
		);
	}

	return timeframe;
};

/** Parse and normalize the requested symbol for funding queries. */
export const parseFundingSymbol = (url: URL): string =>
	getRequiredQueryParam(url, "symbol", "MISSING_SYMBOL", (value) =>
		value.toUpperCase(),
	);

/** Parse and normalize an optional symbol filter. */
export const parseOptionalFundingSymbol = (url: URL): string | undefined => {
	const value = url.searchParams.get("symbol")?.trim();

	return value ? value.toUpperCase() : undefined;
};

/** Parse, validate, and deduplicate requested funding exchanges. */
export const parseFundingExchanges = (url: URL): Exchange[] => {
	const exchangesParam = url.searchParams.get("exchanges")?.trim();

	if (!exchangesParam) {
		return SUPPORTED_FUNDING_EXCHANGES;
	}

	const exchangeCandidates = exchangesParam
		.split(",")
		.map((exchange) => exchange.trim().toLowerCase())
		.filter(Boolean);

	if (exchangeCandidates.length === 0) {
		throw new BadRequestError(
			"Query param `exchanges` must contain at least one exchange",
			"EMPTY_EXCHANGES",
		);
	}

	const invalidExchanges = exchangeCandidates.filter(
		(exchange) => !isFundingExchange(exchange),
	);

	if (invalidExchanges.length > 0) {
		throw new BadRequestError(
			`Unsupported exchanges: ${invalidExchanges.join(",")}`,
			"UNSUPPORTED_EXCHANGES",
		);
	}

	return [...new Set(exchangeCandidates as Exchange[])];
};
