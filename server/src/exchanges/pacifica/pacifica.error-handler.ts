import { ServiceError } from "#common/errors/service-errors";

type ErrorNormalizer = {
	canHandle: (error: unknown) => boolean;
	map: (error: unknown) => ServiceError;
};

const PACIFICA_ERROR_NORMALIZERS: ErrorNormalizer[] = [
	{
		canHandle: (error) => error instanceof ServiceError,
		map: (error) => error as ServiceError,
	},
	{
		canHandle: (error) =>
			error instanceof Error &&
			error.message.toLowerCase().includes("not found"),
		map: (error) =>
			new ServiceError({
				service: "pacifica",
				code: "SYMBOL_NOT_FOUND",
				message: (error as Error).message,
				cause: error,
			}),
	},
	{
		canHandle: (error) => error instanceof TypeError,
		map: (error) =>
			new ServiceError({
				service: "pacifica",
				code: "NETWORK_ERROR",
				message: (error as TypeError).message,
				cause: error,
			}),
	},
	{
		canHandle: (error) => error instanceof Error,
		map: (error) =>
			new ServiceError({
				service: "pacifica",
				code: "API_ERROR",
				message: (error as Error).message,
				cause: error,
			}),
	},
];

/** Converts Pacifica-specific failures into the shared service error shape. */
export const normalizePacificaError = (error: unknown): ServiceError =>
	PACIFICA_ERROR_NORMALIZERS.find((normalizer) =>
		normalizer.canHandle(error),
	)?.map(error) ??
	new ServiceError({
		service: "pacifica",
		code: "UNKNOWN_ERROR",
		message: "Unknown pacifica error",
		cause: error,
	});
