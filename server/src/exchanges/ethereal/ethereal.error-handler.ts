import { ServiceError } from "../../common/errors/service-errors";

type ErrorNormalizer = {
	canHandle: (error: unknown) => boolean;
	map: (error: unknown) => ServiceError;
};

const ETHEREAL_ERROR_NORMALIZERS: ErrorNormalizer[] = [
	{
		canHandle: (error) => error instanceof ServiceError,
		map: (error) => error as ServiceError,
	},
	{
		canHandle: (error) =>
			error instanceof Error &&
			error.message.toLowerCase().includes("not supported"),
		map: (error) =>
			new ServiceError({
				service: "ethereal",
				code: "UNSUPPORTED_TIMEFRAME",
				message: (error as Error).message,
				cause: error,
			}),
	},
	{
		canHandle: (error) =>
			error instanceof Error &&
			error.message.toLowerCase().includes("not found"),
		map: (error) =>
			new ServiceError({
				service: "ethereal",
				code: "SYMBOL_NOT_FOUND",
				message: (error as Error).message,
				cause: error,
			}),
	},
	{
		canHandle: (error) => error instanceof TypeError,
		map: (error) =>
			new ServiceError({
				service: "ethereal",
				code: "NETWORK_ERROR",
				message: (error as TypeError).message,
				cause: error,
			}),
	},
	{
		canHandle: (error) => error instanceof Error,
		map: (error) =>
			new ServiceError({
				service: "ethereal",
				code: "API_ERROR",
				message: (error as Error).message,
				cause: error,
			}),
	},
];

export const normalizeEtherealError = (error: unknown): ServiceError =>
	ETHEREAL_ERROR_NORMALIZERS.find((normalizer) =>
		normalizer.canHandle(error),
	)?.map(error) ??
	new ServiceError({
		service: "ethereal",
		code: "UNKNOWN_ERROR",
		message: "Unknown ethereal error",
		cause: error,
	});
