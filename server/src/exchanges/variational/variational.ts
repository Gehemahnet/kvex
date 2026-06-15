import { FetchHttpClient, type HttpClient } from "#common/http-client";
import type { VariationalStatsResponse } from "./variational.types";

class VariationalClient {
	private baseUrl: string;
	private httpClient: HttpClient;

	constructor(params: { baseUrl: string; httpClient: HttpClient }) {
		this.baseUrl = params.baseUrl;
		this.httpClient = params.httpClient;
	}

	async getStats(): Promise<VariationalStatsResponse> {
		return this.httpClient.get<VariationalStatsResponse>(
			`${this.baseUrl}/metadata/stats`,
		);
	}
}

export const variationalClient = new VariationalClient({
	baseUrl: "https://omni-client-api.prod.ap-northeast-1.variational.io",
	httpClient: new FetchHttpClient(),
});
