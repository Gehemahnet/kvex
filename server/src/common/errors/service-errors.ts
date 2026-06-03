export class ServiceError extends Error {
	service: string;
	code: string;
	cause?: unknown;

	constructor(params: {
		service: string;
		code: string;
		message: string;
		cause?: unknown;
	}) {
		super(params.message);
		this.name = "ServiceError";
		this.service = params.service;
		this.code = params.code;
		this.cause = params.cause;
	}
}
