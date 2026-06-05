import { FetchHttpClient, type HttpClient } from "../../common/http-client";
import type { OkxInstrument, OkxResponse, OkxTicker } from "./okx.types";

class OkxClient {
	private baseUrl: string;
	private httpClient: HttpClient;

	constructor(params: { baseUrl: string; httpClient: HttpClient }) {
		this.baseUrl = params.baseUrl;
		this.httpClient = params.httpClient;
	}

	async getSwapInstruments(): Promise<OkxInstrument[]> {
		const response = await this.httpClient.get<OkxResponse<OkxInstrument>>(
			`${this.baseUrl}/api/v5/public/instruments?instType=SWAP`,
		);

		return response.data;
	}

	async getSwapTickers(): Promise<OkxTicker[]> {
		const response = await this.httpClient.get<OkxResponse<OkxTicker>>(
			`${this.baseUrl}/api/v5/market/tickers?instType=SWAP`,
		);

		return response.data;
	}
}

export const okxClient = new OkxClient({
	baseUrl: "https://www.okx.com",
	httpClient: new FetchHttpClient(),
});
