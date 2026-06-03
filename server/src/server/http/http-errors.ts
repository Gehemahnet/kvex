export type ErrorResponseBody = {
	error: {
		code: string;
		message: string;
	};
};

export class HttpError extends Error {
	statusCode: number;
	code: string;

	constructor(params: {
		message: string;
		statusCode: number;
		code: string;
	}) {
		super(params.message);
		this.name = "HttpError";
		this.statusCode = params.statusCode;
		this.code = params.code;
	}
}

export class BadRequestError extends HttpError {
	constructor(message: string, code: string = "BAD_REQUEST") {
		super({ message, statusCode: 400, code });
		this.name = "BadRequestError";
	}
}

export class MethodNotAllowedError extends HttpError {
	constructor(method: string | undefined, path: string) {
		super({
			message: `Method ${method ?? "UNKNOWN"} is not allowed for ${path}`,
			statusCode: 405,
			code: "METHOD_NOT_ALLOWED",
		});
		this.name = "MethodNotAllowedError";
	}
}

export class NotFoundError extends HttpError {
	constructor(path: string) {
		super({
			message: `Route ${path} was not found`,
			statusCode: 404,
			code: "ROUTE_NOT_FOUND",
		});
		this.name = "NotFoundError";
	}
}

export class InternalServerError extends HttpError {
	constructor(message: string = "Internal server error") {
		super({
			message,
			statusCode: 500,
			code: "INTERNAL_SERVER_ERROR",
		});
		this.name = "InternalServerError";
	}
}

type HttpErrorNormalizer = {
	canHandle: (error: unknown) => boolean;
	map: (error: unknown) => HttpError;
};

const HTTP_ERROR_NORMALIZERS: HttpErrorNormalizer[] = [
	{
		canHandle: (error): error is HttpError => error instanceof HttpError,
		map: (error) => error as HttpError,
	},
	{
		canHandle: (error): error is TypeError => error instanceof TypeError,
		map: (error) =>
			new BadRequestError((error as TypeError).message, "INVALID_REQUEST"),
	},
	{
		canHandle: (error): error is Error => error instanceof Error,
		map: (error) =>
			new InternalServerError((error as Error).message),
	},
];

/** Convert any thrown value into a normalized HTTP error. */
export const normalizeHttpError = (error: unknown): HttpError =>
	HTTP_ERROR_NORMALIZERS.find((normalizer) => normalizer.canHandle(error))?.map(
		error,
	) ?? new InternalServerError();

/** Extract a human-readable message from any thrown value. */
export const getErrorMessage = (error: unknown): string =>
	normalizeHttpError(error).message;

/** Build a stable JSON error response payload for HTTP transport. */
export const toErrorResponseBody = (error: HttpError): ErrorResponseBody => ({
	error: {
		code: error.code,
		message: error.message,
	},
});
