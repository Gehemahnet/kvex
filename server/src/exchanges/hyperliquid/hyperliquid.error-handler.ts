import { ServiceError } from "../../common/errors/service-errors";

type ErrorNormalizer = {
	canHandle: (error: unknown) => boolean;
	map: (error: unknown) => ServiceError;
};

const HYPERLIQUID_ERROR_NORMALIZERS: ErrorNormalizer[] = [
	{
		canHandle: (error) => error instanceof ServiceError,
		map: (error) => error as ServiceError,
	},
	{
		canHandle: (error) => error instanceof TypeError,
		map: (error) =>
			new ServiceError({
				service: "hyperliquid",
				code: "NETWORK_ERROR",
				message: (error as TypeError).message,
				cause: error,
			}),
	},
	{
		canHandle: (error) => error instanceof Error,
		map: (error) =>
			new ServiceError({
				service: "hyperliquid",
				code: "API_ERROR",
				message: (error as Error).message,
				cause: error,
			}),
	},
];

/** Converts Hyperliquid-specific failures into the shared service error shape. */
export const normalizeHyperliquidError = (error: unknown): ServiceError =>
	HYPERLIQUID_ERROR_NORMALIZERS.find((normalizer) =>
		normalizer.canHandle(error),
	)?.map(error) ??
	new ServiceError({
		service: "hyperliquid",
		code: "UNKNOWN_ERROR",
		message: "Unknown hyperliquid error",
		cause: error,
	});
