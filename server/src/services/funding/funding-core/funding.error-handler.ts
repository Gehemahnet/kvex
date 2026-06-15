import { ServiceError } from "#common/errors/service-errors";
import type { Exchange } from "#common/types";
import type { FundingExchangeError, FundingSeries } from "#services/funding/funding-core/funding.types";

type FundingSettledResult =
	| { data: FundingSeries; error?: never }
	| { data?: never; error: FundingExchangeError };

type ResultMapperContext = {
	exchange: Exchange;
	result: PromiseSettledResult<FundingSeries>;
};

type ResultMapper = (context: ResultMapperContext) => FundingSettledResult;

const FUNDING_SETTLED_RESULT_MAPPERS: Record<
	PromiseSettledResult<FundingSeries>["status"],
	ResultMapper
> = {
	fulfilled: ({ result }) => ({
		data: (result as PromiseFulfilledResult<FundingSeries>).value,
	}),
	rejected: ({ exchange, result }) => {
		const normalizedError = normalizeFundingServiceError(
			exchange,
			(result as PromiseRejectedResult).reason,
		);

		return {
			error: {
				exchange,
				code: normalizedError.code,
				message: normalizedError.message,
			},
		};
	},
};

/** Map a settled per-exchange funding fetch result into data or error payload. */
export const mapFundingSettledResult = (
	context: ResultMapperContext,
): FundingSettledResult =>
	FUNDING_SETTLED_RESULT_MAPPERS[context.result.status](context);

/** Convert an unknown funding error into a stable service-level error object. */
export const normalizeFundingServiceError = (
	exchange: Exchange,
	error: unknown,
): ServiceError => {
	if (error instanceof ServiceError) {
		return error;
	}

	return new ServiceError({
		service: exchange,
		code: "UNKNOWN_ERROR",
		message: error instanceof Error ? error.message : "Unknown funding error",
		cause: error,
	});
};
