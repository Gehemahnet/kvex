import { createHmac } from "node:crypto";
import { FetchHttpClient, type HttpClient } from "#common/http-client";
import type {
	OkxAccountBalance,
	OkxInstrument,
	OkxResponse,
	OkxTicker,
	OkxTradeFee,
} from "./okx.types";

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

	async getAccountBalance(credentials: {
		apiKey: string;
		apiSecret: string;
		passphrase: string;
	}): Promise<OkxAccountBalance[]> {
		const requestPath = "/api/v5/account/balance";
		const timestamp = new Date().toISOString();
		const response = await this.httpClient.get<OkxResponse<OkxAccountBalance>>(
			`${this.baseUrl}${requestPath}`,
			{
				headers: createOkxAuthHeaders({
					...credentials,
					method: "GET",
					requestPath,
					timestamp,
				}),
			},
		);

		return response.data;
	}

	async getTradeFee(credentials: {
		apiKey: string;
		apiSecret: string;
		passphrase: string;
	}, params: {
		instType: "SWAP";
	}): Promise<OkxTradeFee[]> {
		const query = new URLSearchParams({ instType: params.instType });
		const requestPath = `/api/v5/account/trade-fee?${query.toString()}`;
		const timestamp = new Date().toISOString();
		const response = await this.httpClient.get<OkxResponse<OkxTradeFee>>(
			`${this.baseUrl}${requestPath}`,
			{
				headers: createOkxAuthHeaders({
					...credentials,
					method: "GET",
					requestPath,
					timestamp,
				}),
			},
		);

		return response.data;
	}
}

const createOkxAuthHeaders = (params: {
	apiKey: string;
	apiSecret: string;
	method: "GET" | "POST";
	passphrase: string;
	requestPath: string;
	timestamp: string;
}): Record<string, string> => {
	const prehash = `${params.timestamp}${params.method}${params.requestPath}`;
	const signature = createHmac("sha256", params.apiSecret)
		.update(prehash)
		.digest("base64");

	return {
		"OK-ACCESS-KEY": params.apiKey,
		"OK-ACCESS-PASSPHRASE": params.passphrase,
		"OK-ACCESS-SIGN": signature,
		"OK-ACCESS-TIMESTAMP": params.timestamp,
	};
};

export const okxClient = new OkxClient({
	baseUrl: "https://www.okx.com",
	httpClient: new FetchHttpClient(),
});
