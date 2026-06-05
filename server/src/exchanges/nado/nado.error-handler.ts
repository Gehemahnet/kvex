import { ServiceError } from "../../common/errors/service-errors";

/** Converts Nado-specific failures into the shared service error shape. */
export const normalizeNadoError = (error: unknown): ServiceError => {
	if (error instanceof ServiceError) {
		return error;
	}

	if (error instanceof TypeError) {
		return new ServiceError({
			service: "nado",
			code: "NETWORK_ERROR",
			message: error.message,
			cause: error,
		});
	}

	if (error instanceof Error) {
		return new ServiceError({
			service: "nado",
			code: error.message.toLowerCase().includes("not found")
				? "SYMBOL_NOT_FOUND"
				: "API_ERROR",
			message: error.message,
			cause: error,
		});
	}

	return new ServiceError({
		service: "nado",
		code: "UNKNOWN_ERROR",
		message: "Unknown nado error",
		cause: error,
	});
};
