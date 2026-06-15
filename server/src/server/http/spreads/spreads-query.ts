import type { SpreadsQuery } from "#services/spreads/spreads-core/spreads.types";
import {
	parseFundingExchanges,
	parseOptionalFundingSymbol,
} from "../funding-query.utils";
import { BadRequestError } from "../http-errors";

/** Parses and validates `/spreads` REST query parameters. */
export const parseSpreadsQuery = (
	urlString: string | undefined,
): SpreadsQuery => {
	const url = new URL(urlString ?? "/", "http://localhost");
	const symbol = parseOptionalFundingSymbol(url);
	const minPriceSpreadPercent = parseOptionalPercent(
		url,
		"minPriceSpreadPercent",
	);
	const maxSnapshotAgeMs = parseOptionalNonNegativeNumber(
		url,
		"maxSnapshotAgeMs",
	);
	const positionSizeUsd = parseOptionalNonNegativeNumber(
		url,
		"positionSizeUsd",
	);
	const minOccurrences = parseOptionalNonNegativeInteger(
		url,
		"minOccurrences",
	);
	const minLifetimeMs = parseOptionalNonNegativeNumber(url, "minLifetimeMs");
	const holdingPeriodHours = parseOptionalNonNegativeNumber(
		url,
		"holdingPeriodHours",
	);

	return {
		exchanges: parseFundingExchanges(url),
		...(symbol ? { symbol } : {}),
		...(minPriceSpreadPercent !== undefined ? { minPriceSpreadPercent } : {}),
		...(maxSnapshotAgeMs !== undefined ? { maxSnapshotAgeMs } : {}),
		...(positionSizeUsd !== undefined ? { positionSizeUsd } : {}),
		...(minOccurrences !== undefined ? { minOccurrences } : {}),
		...(minLifetimeMs !== undefined ? { minLifetimeMs } : {}),
		...(holdingPeriodHours !== undefined ? { holdingPeriodHours } : {}),
	};
};

const parseOptionalPercent = (
	url: URL,
	key: string,
): number | undefined => {
	const value = url.searchParams.get(key)?.trim();

	if (!value) {
		return undefined;
	}

	const numberValue = Number(value);

	if (Number.isNaN(numberValue) || numberValue < 0) {
		throw new BadRequestError(
			`Query param \`${key}\` must be a non-negative number`,
			"INVALID_PERCENT_FILTER",
		);
	}

	return numberValue;
};

const parseOptionalNonNegativeNumber = (
	url: URL,
	key: string,
): number | undefined => {
	const value = url.searchParams.get(key)?.trim();

	if (!value) {
		return undefined;
	}

	const numberValue = Number(value);

	if (Number.isNaN(numberValue) || numberValue < 0) {
		throw new BadRequestError(
			`Query param \`${key}\` must be a non-negative number`,
			"INVALID_NUMBER_FILTER",
		);
	}

	return numberValue;
};

const parseOptionalNonNegativeInteger = (
	url: URL,
	key: string,
): number | undefined => {
	const value = url.searchParams.get(key)?.trim();

	if (!value) {
		return undefined;
	}

	const numberValue = Number(value);

	if (
		Number.isNaN(numberValue) ||
		numberValue < 0 ||
		!Number.isInteger(numberValue)
	) {
		throw new BadRequestError(
			`Query param \`${key}\` must be a non-negative integer`,
			"INVALID_INTEGER_FILTER",
		);
	}

	return numberValue;
};
