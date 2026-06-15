export type ApiQueryValue = boolean | number | string | null | undefined;
export type ApiQueryParams = Record<string, ApiQueryValue | ApiQueryValue[]>;

export type ApiRequestOptions<TBody = unknown> =
	Omit<RequestInit, "body"> & {
		body?: TBody;
		query?: ApiQueryParams;
	};

export type ApiErrorResponse = {
	error?: {
		message?: string;
	};
};
