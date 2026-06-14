export interface HttpClient {
	get<Response>(url: string, init?: RequestInit): Promise<Response>;
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

type FetchHttpClientOptions = {
	retryAttempts?: number;
	retryDelayMs?: number;
	sleep?: (durationMs: number) => Promise<void>;
};

export class FetchHttpClient implements HttpClient {
	private retryAttempts: number;
	private retryDelayMs: number;
	private sleep: (durationMs: number) => Promise<void>;

	constructor(options: FetchHttpClientOptions = {}) {
		this.retryAttempts = options.retryAttempts ?? 2;
		this.retryDelayMs = options.retryDelayMs ?? 250;
		this.sleep =
			options.sleep ??
			((durationMs) =>
				new Promise((resolve) => {
					setTimeout(resolve, durationMs);
				}));
	}

	async get<Response>(url: string, init?: RequestInit): Promise<Response> {
		const response = await this.fetchWithRetry(url, init);
		return response.json();
	}

	async post<Response, Body, Params>(
		url: string,
		body: Body,
		params: Params,
	): Promise<Response> {
		const response = await this.fetchWithRetry(url, {
			method: "POST",
			body: JSON.stringify(body),
			headers: {
				"Content-Type": "application/json",
			},
			...params,
		});

		return response.json();
	}

	private async fetchWithRetry(
		url: string,
		init?: RequestInit,
	): Promise<Response> {
		for (let attempt = 0; attempt <= this.retryAttempts; attempt += 1) {
			const response = await fetch(url, init);

			if (response.ok) {
				return response;
			}

			if (!this.shouldRetry(response.status, attempt)) {
				throw new UpstreamHttpError({
					url,
					status: response.status,
					statusText: response.statusText,
				});
			}

			await this.sleep(this.retryDelayMs * (attempt + 1));
		}

		throw new UpstreamHttpError({
			url,
			status: 500,
			statusText: "Retry attempts exhausted",
		});
	}

	private shouldRetry(status: number, attempt: number): boolean {
		if (attempt >= this.retryAttempts) {
			return false;
		}

		return status === 429 || status >= 500;
	}
}
