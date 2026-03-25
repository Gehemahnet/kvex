export interface HttpClient {
	get<Response>(url: string): Promise<Response>;
	post<Body, Params, Response>(
		url: string,
		body: Body,
		params: Params,
	): Promise<Response>;
}

export class FetchHttpClient implements HttpClient {
	async get<Response, Error>(url: string): Promise<Response | Error> {
		try {
			const response = await fetch(url);

			return response.json();
		} catch (error) {
			return error;
		}
	}

	async post<Response, Body, Params>(
		url: string,
		body: Body,
		params: Params,
	): Promise<Response> {
		const response = await fetch(url, {
			method: "POST",
			body,
			...params,
		});

		return response.json();
	}
}
