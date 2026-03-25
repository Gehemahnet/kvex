import { HttpClient } from "./http-client";

export abstract class DexRestClient {
	protected baseUrl: string;
	protected httpClient: HttpClient;

	constructor(params: {
		baseUrl: string;
		httpClient: HttpClient;
	}) {
		const { baseUrl, httpClient } = params;

		this.baseUrl = baseUrl;
		this.httpClient = httpClient;
	}

	protected async fetchData<
		ResponseData = object,
		QueryParams = Record<string, string | string[] | undefined>,
	>(
		path: string,
		params?: {
			headers?: Record<string, string>;
			query?: QueryParams;
		},
	): Promise<ResponseData | undefined> {
		const url = new URL(`${this.baseUrl}/${path}`);

		if (params?.query) {
			Object.entries(params.query).forEach(([key, value]) => {
				if (value && Array.isArray(value)) {
					value.forEach((val) => url.searchParams.append(key, val));
				} else if (value && !Array.isArray(value)) {
					url.searchParams.set(key, value);
				}
			});
		}

		return this.httpClient.get<ResponseData>(url);
	}
}
