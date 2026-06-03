export interface HttpClient {
	get<Response>(url: string): Promise<Response>;
	post<Response, Body, Params = {}>(
		url: string,
		body: Body,
		params?: Params,
	): Promise<Response>;
}

export class UpstreamHttpError extends Error {
	url: string;
	status: number;

	constructor(params: { url: string; status: number; statusText: string }) {
		super(`HTTP ${params.status} for ${params.url}: ${params.statusText}`);
		this.name = "UpstreamHttpError";
		this.url = params.url;
		this.status = params.status;
	}
}

export class FetchHttpClient implements HttpClient {
	async get<Response>(url: string): Promise<Response> {
		const response = await fetch(url);

		if (!response.ok) {
			throw new UpstreamHttpError({
				url,
				status: response.status,
				statusText: response.statusText,
			});
		}

		return response.json();
	}

	async post<Response, Body, Params>(
		url: string,
		body: Body,
		params: Params,
	): Promise<Response> {
		const response = await fetch(url, {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
			...params,
		});

		if (!response.ok) {
			throw new UpstreamHttpError({
				url,
				status: response.status,
				statusText: response.statusText,
			});
		}

		return response.json();
	}
}
