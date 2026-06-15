import { FetchHttpClient, type HttpClient } from "#common/http-client";
import type {
	NadoFundingRate,
	NadoFundingRatesResponse,
	NadoMarketLiquidity,
	NadoMarketLiquidityResponse,
	NadoPerpPricesResponse,
	NadoSymbol,
} from "./nado.types";

class NadoClient {
	private archiveBaseUrl: string;
	private gatewayBaseUrl: string;
	private httpClient: HttpClient;

	constructor(params: {
		archiveBaseUrl: string;
		gatewayBaseUrl: string;
		httpClient: HttpClient;
	}) {
		this.archiveBaseUrl = params.archiveBaseUrl;
		this.gatewayBaseUrl = params.gatewayBaseUrl;
		this.httpClient = params.httpClient;
	}

	async getSymbols(): Promise<NadoSymbol[]> {
		return this.httpClient.get<NadoSymbol[]>(`${this.gatewayBaseUrl}/symbols`);
	}

	async getFundingRates(productIds: number[]): Promise<NadoFundingRatesResponse> {
		return this.httpClient.post<
			NadoFundingRatesResponse,
			{ funding_rates: { product_ids: number[] } },
			RequestInit
		>(
			this.archiveBaseUrl,
			{
				funding_rates: {
					product_ids: productIds,
				},
			},
			createArchiveRequestInit(),
		);
	}

	async getFundingRate(productId: number): Promise<NadoFundingRate> {
		return this.httpClient.post<
			NadoFundingRate,
			{ funding_rate: { product_id: number } },
			RequestInit
		>(
			this.archiveBaseUrl,
			{
				funding_rate: {
					product_id: productId,
				},
			},
			createArchiveRequestInit(),
		);
	}

	async getPerpPrices(productIds: number[]): Promise<NadoPerpPricesResponse> {
		return this.httpClient.post<
			NadoPerpPricesResponse,
			{ perp_prices: { product_ids: number[] } },
			RequestInit
		>(
			this.archiveBaseUrl,
			{
				perp_prices: {
					product_ids: productIds,
				},
			},
			createArchiveRequestInit(),
		);
	}

	async getMarketLiquidity(
		productId: number,
		depth: number,
	): Promise<NadoMarketLiquidity | undefined> {
		const response = await this.httpClient.post<
			NadoMarketLiquidityResponse,
			{ type: "market_liquidity"; product_id: number; depth: number },
			RequestInit
		>(
			`${this.gatewayBaseUrl}/query`,
			{
				type: "market_liquidity",
				product_id: productId,
				depth,
			},
			createGatewayRequestInit(),
		);

		return response.status === "success" ? response.data : undefined;
	}
}

const createArchiveRequestInit = (): RequestInit => ({
	headers: {
		"Content-Type": "application/json",
		"Accept-Encoding": "gzip, br, deflate",
	},
});

const createGatewayRequestInit = (): RequestInit => ({
	headers: {
		"Content-Type": "application/json",
		"Accept-Encoding": "gzip, br, deflate",
	},
});

export const nadoClient = new NadoClient({
	archiveBaseUrl: "https://archive.prod.nado.xyz/v1",
	gatewayBaseUrl: "https://gateway.prod.nado.xyz/v1",
	httpClient: new FetchHttpClient(),
});
