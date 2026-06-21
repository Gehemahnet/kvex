import type {
	ApiErrorResponse,
	ApiQueryParams,
	ApiQueryValue,
	ApiRequestOptions,
} from "./api-client.types";
import { notifyBackendUnavailable } from "./api-client.events";

export class ApiRequestError extends Error {
	constructor(
		message: string,
		readonly status: number,
	) {
		super(message);
		this.name = "ApiRequestError";
	}
}

/** Sends a typed JSON API request and returns the parsed response body. */
export const apiRequest = async <TResponse, TBody = unknown>(
	pathname: string,
	options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> => {
	const { body, query, ...fetchOptions } = options;
	let response: Response;

	try {
		response = await fetch(createApiUrl(pathname, query), {
			...fetchOptions,
			headers: createApiHeaders(options),
			body: createApiBody(body),
		});
	} catch (error) {
		notifyBackendUnavailable(pathname);

		throw error;
	}

	if (!response.ok) {
		if (response.status >= 500) {
			notifyBackendUnavailable(pathname);
		}

		throw new ApiRequestError(
			await getApiErrorMessage(response, pathname),
			response.status,
		);
	}

	return readApiJson<TResponse>(response);
};

/** Sends a typed JSON API request where callers do not need a response body. */
export const apiRequestVoid = async <TBody = unknown>(
	pathname: string,
	options: ApiRequestOptions<TBody> = {},
): Promise<void> => {
	await apiRequest<unknown, TBody>(pathname, options);
};

/** Sends a typed GET request. */
export const apiGet = <TResponse>(
	pathname: string,
	options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<TResponse> =>
	apiRequest<TResponse>(pathname, {
		...options,
		method: "GET",
	});

/** Sends a typed POST request with an optional JSON body. */
export const apiPost = <TResponse, TBody = unknown>(
	pathname: string,
	body?: TBody,
	options: Omit<ApiRequestOptions<TBody>, "body" | "method"> = {},
): Promise<TResponse> =>
	apiRequest<TResponse, TBody>(pathname, {
		...options,
		body,
		method: "POST",
	});

/** Sends a typed POST request where callers do not need a response body. */
export const apiPostVoid = <TBody = unknown>(
	pathname: string,
	body?: TBody,
	options: Omit<ApiRequestOptions<TBody>, "body" | "method"> = {},
): Promise<void> =>
	apiRequestVoid<TBody>(pathname, {
		...options,
		body,
		method: "POST",
	});

/** Sends a typed PATCH request with an optional JSON body. */
export const apiPatch = <TResponse, TBody = unknown>(
	pathname: string,
	body?: TBody,
	options: Omit<ApiRequestOptions<TBody>, "body" | "method"> = {},
): Promise<TResponse> =>
	apiRequest<TResponse, TBody>(pathname, {
		...options,
		body,
		method: "PATCH",
	});

/** Sends a typed DELETE request. */
export const apiDelete = <TResponse>(
	pathname: string,
	options: Omit<ApiRequestOptions, "body" | "method"> = {},
): Promise<TResponse> =>
	apiRequest<TResponse>(pathname, {
		...options,
		method: "DELETE",
	});

/** Creates a URL with normalized query params. */
export const createApiUrl = (
	pathname: string,
	query?: ApiQueryParams,
): string => {
	if (!query) {
		return pathname;
	}

	const searchParams = new URLSearchParams();

	for (const [key, rawValue] of Object.entries(query)) {
		setApiQueryParam(searchParams, key, rawValue);
	}

	const queryString = searchParams.toString();

	return queryString ? `${pathname}?${queryString}` : pathname;
};

const setApiQueryParam = (
	searchParams: URLSearchParams,
	key: string,
	value: ApiQueryValue | ApiQueryValue[],
): void => {
	if (Array.isArray(value)) {
		const values = value.filter(isPresentQueryValue);

		if (values.length > 0) {
			searchParams.set(key, values.map(String).join(","));
		}

		return;
	}

	if (isPresentQueryValue(value)) {
		searchParams.set(key, String(value));
	}
};

const isPresentQueryValue = (
	value: ApiQueryValue,
): value is boolean | number | string =>
	value !== null && value !== undefined && value !== "";

const createApiHeaders = <TBody>(
	options: ApiRequestOptions<TBody>,
): HeadersInit => {
	const headers = new Headers(options.headers);

	if (options.body !== undefined && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	return headers;
};

const createApiBody = <TBody>(body: TBody | undefined): BodyInit | undefined => {
	if (body === undefined) {
		return undefined;
	}

	return typeof body === "string" ? body : JSON.stringify(body);
};

const readApiJson = async <TResponse>(response: Response): Promise<TResponse> => {
	if (response.status === 204) {
		return undefined as TResponse;
	}

	const text = await response.text();

	if (!text) {
		return undefined as TResponse;
	}

	return JSON.parse(text) as TResponse;
};

const getApiErrorMessage = async (
	response: Response,
	pathname: string,
): Promise<string> => {
	const body = await readApiJson<ApiErrorResponse | undefined>(response)
		.catch(() => undefined);

	return body?.error?.message ??
		`API request failed (${response.status}) for ${pathname}`;
};
