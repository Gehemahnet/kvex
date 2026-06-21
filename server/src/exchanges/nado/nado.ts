import {
	CHAIN_ENV_TO_CHAIN,
	createNadoClient,
	type ChainEnv,
	type BalanceWithProduct,
	type EngineSymbolsResponse,
	type GetEngineMarketLiquidityResponse,
	type GetIndexerMultiProductFundingRatesResponse,
	type GetIndexerMultiProductPerpPricesResponse,
	type IndexerFundingRate,
	type IndexerPerpPrices,
	type NadoClient as NadoSdkClient,
} from "@nadohq/client";
import BigNumber from "bignumber.js";
import { createPublicClient, http } from "viem";
import type {
	NadoFundingRate,
	NadoFundingRatesResponse,
	NadoMarketLiquidity,
	NadoPerpPrice,
	NadoPerpPricesResponse,
	NadoSubaccountBalance,
	NadoSubaccountSummary,
	NadoSymbol,
	NadoTrade,
} from "./nado.types";
import type { NadoWsSubscriptionMessage } from "./nado.ws.types";

const NADO_CHAIN_ENV: ChainEnv = "inkMainnet";
const NADO_X18_SCALE = new BigNumber(10).pow(18);
type NadoSdkAccountOptions = Parameters<typeof createNadoClient>[1];

class NadoClient {
	private sdkClient: NadoSdkClient;

	constructor(params: {
		sdkClient: NadoSdkClient;
	}) {
		this.sdkClient = params.sdkClient;
	}

	async getSymbols(): Promise<NadoSymbol[]> {
		const response = await this.sdkClient.market.getSymbols();

		return mapNadoSdkSymbols(response);
	}

	async getFundingRates(productIds: number[]): Promise<NadoFundingRatesResponse> {
		if (productIds.length === 0) {
			return {};
		}

		const response = await this.sdkClient.market.getMultiProductFundingRates({
			productIds,
		});

		return mapNadoSdkFundingRates(response);
	}

	async getFundingRate(productId: number): Promise<NadoFundingRate> {
		const response = await this.sdkClient.market.getFundingRate({ productId });

		return mapNadoSdkFundingRate(response);
	}

	async getPerpPrices(productIds: number[]): Promise<NadoPerpPricesResponse> {
		if (productIds.length === 0) {
			return {};
		}

		const response = await this.sdkClient.perp.getMultiProductPerpPrices({
			productIds,
		});

		return mapNadoSdkPerpPrices(response);
	}

	async getMarketLiquidity(
		productId: number,
		depth: number,
	): Promise<NadoMarketLiquidity | undefined> {
		const response = await this.sdkClient.market.getMarketLiquidity({
			productId,
			depth,
		});

		return mapNadoSdkMarketLiquidity(productId, response);
	}

	async getSubaccountSummary(params: {
		subaccountName: string;
		subaccountOwner: string;
	}): Promise<NadoSubaccountSummary> {
		const timestamp = Math.floor(Date.now() / 1_000);
		const [summary, symbols, snapshots] = await Promise.all([
			this.sdkClient.subaccount.getSubaccountSummary(params),
			this.getSymbols(),
			this.sdkClient.context.indexerClient.getMultiSubaccountSnapshots({
				subaccounts: [params],
				timestamps: [timestamp],
				isolated: false,
			}),
		]);
		const symbolsByProductId = new Map(
			symbols.map((symbol) => [symbol.product_id, symbol.symbol]),
		);

		const perpProductIds = summary.balances
			.filter((balance) => Number(balance.type) === 1)
			.map((balance) => balance.productId);
		const perpPrices = perpProductIds.length === 0
			? {}
			: await this.sdkClient.perp.getMultiProductPerpPrices({
				productIds: perpProductIds,
			});
		const snapshot = Object.values(
			snapshots.snapshots[snapshots.subaccountHexIds[0] ?? ""] ?? {},
		)[0];
		const netEntriesByProductId = new Map(
			(snapshot?.balances ?? []).map((balance) => [
				balance.productId,
				fromX18String(balance.trackedVars.netEntryUnrealized),
			]),
		);

		return {
			exists: summary.exists,
			balances: summary.balances.map((balance) =>
				mapNadoSdkSubaccountBalance(
					balance,
					symbolsByProductId,
					netEntriesByProductId.get(balance.productId),
					perpPrices[balance.productId]?.markPrice.toFixed(),
				)
			),
		};
	}

	async getTradeHistory(params: {
		subaccountName: string;
		subaccountOwner: string;
		limit?: number;
	}): Promise<NadoTrade[]> {
		const response = await this.sdkClient.context.indexerClient
			.getPaginatedSubaccountMatchEvents({
				limit: params.limit ?? 100,
				subaccountName: params.subaccountName,
				subaccountOwner: params.subaccountOwner,
			});

		return response.events.map((event) => {
			const baseFilled = fromX18(event.baseFilled);
			const quoteFilled = fromX18(event.quoteFilled);

			return {
				fee: fromX18(event.totalFee).toFixed(),
				id: `${event.submissionIndex}:${event.digest}`,
				price: baseFilled.isZero()
					? "0"
					: quoteFilled.dividedBy(baseFilled).abs().toFixed(),
				productId: event.productId,
				realizedPnl: fromX18(event.realizedPnl).toFixed(),
				side: baseFilled.isPositive() ? "buy" : "sell",
				size: baseFilled.abs().toFixed(),
				timestamp: event.timestamp.toFixed(0),
			};
		});
	}

	createMarketDataSubscriptionMessages(
		productIds: number[],
	): NadoWsSubscriptionMessage[] {
		return productIds
			.flatMap(createNadoProductSubscriptions)
			.map(({ streamType, productId }, index) => {
				const params = this.sdkClient.ws.subscription.buildSubscriptionParams(
					streamType,
					{
						product_id: productId,
					},
				);
				this.sdkClient.ws.subscription.buildSubscriptionMessage(
					index + 1,
					"subscribe",
					params,
				);

				return {
					id: index + 1,
					method: "subscribe",
					stream: params.stream as NadoWsSubscriptionMessage["stream"],
				};
			});
	}
}

const createNadoSdkClient = (params: {
	chainEnv: ChainEnv;
	publicClient: NadoSdkAccountOptions["publicClient"];
}): NadoSdkClient =>
	createNadoClient(params.chainEnv, {
		publicClient: params.publicClient,
	});

const mapNadoSdkSymbols = (
	response: EngineSymbolsResponse,
): NadoSymbol[] =>
	Object.values(response.symbols).map((symbol) => ({
		type: normalizeNadoSdkSymbolType(symbol.type, symbol.symbol),
		product_id: symbol.productId,
		symbol: symbol.symbol,
		maker_fee_rate_x18: toX18String(symbol.makerFeeRate),
		taker_fee_rate_x18: toX18String(symbol.takerFeeRate),
		trading_status: "live",
	}));

const mapNadoSdkFundingRates = (
	response: GetIndexerMultiProductFundingRatesResponse,
): NadoFundingRatesResponse =>
	Object.fromEntries(
		Object.entries(response).map(([productId, fundingRate]) => [
			productId,
			mapNadoSdkFundingRate(fundingRate),
		]),
	);

const mapNadoSdkFundingRate = (
	fundingRate: IndexerFundingRate,
): NadoFundingRate => ({
	product_id: fundingRate.productId,
	funding_rate_x18: toX18String(fundingRate.fundingRate),
	update_time: fundingRate.updateTime.toFixed(0),
});

const mapNadoSdkPerpPrices = (
	response: GetIndexerMultiProductPerpPricesResponse,
): NadoPerpPricesResponse =>
	Object.fromEntries(
		Object.entries(response).map(([productId, perpPrice]) => [
			productId,
			mapNadoSdkPerpPrice(perpPrice),
		]),
	);

const mapNadoSdkPerpPrice = (perpPrice: IndexerPerpPrices): NadoPerpPrice => ({
	product_id: perpPrice.productId,
	index_price_x18: toX18String(perpPrice.indexPrice),
	mark_price_x18: toX18String(perpPrice.markPrice),
	update_time: perpPrice.updateTime.toFixed(0),
});

const mapNadoSdkMarketLiquidity = (
	productId: number,
	response: GetEngineMarketLiquidityResponse,
): NadoMarketLiquidity => ({
	bids: response.bids.map((level) => [
		toX18String(level.price),
		toX18String(level.liquidity),
	]),
	asks: response.asks.map((level) => [
		toX18String(level.price),
		toX18String(level.liquidity),
	]),
	product_id: productId,
	timestamp: String(Date.now()),
});

const mapNadoSdkSubaccountBalance = (
	balance: BalanceWithProduct,
	symbolsByProductId: Map<number, string>,
	netEntryUnrealized?: string,
	markPrice?: string,
): NadoSubaccountBalance => {
	const amount = fromX18String(balance.amount);
	const oraclePrice = balance.oraclePrice.toFixed();
	const normalizedAmount = fromX18(balance.amount);
	const valueUsd = normalizedAmount.multipliedBy(balance.oraclePrice).toNumber();
	const isPerp = Number(balance.type) === 1;

	return {
		amount,
		...(markPrice === undefined ? {} : { markPrice }),
		...(netEntryUnrealized === undefined ? {} : { netEntryUnrealized }),
		oraclePrice,
		productId: balance.productId,
		symbol: symbolsByProductId.get(balance.productId),
		type: isPerp ? "perp" : "spot",
		...(Number.isFinite(valueUsd) ? { valueUsd } : {}),
		...(isPerp && "vQuoteBalance" in balance
			? { vQuoteBalance: fromX18String(balance.vQuoteBalance) }
			: {}),
	};
};

const fromX18 = (value: BigNumber): BigNumber =>
	value.dividedBy(NADO_X18_SCALE);

const fromX18String = (value: BigNumber): string =>
	fromX18(value).toFixed();

const toX18String = (value: BigNumber): string =>
	value.multipliedBy(NADO_X18_SCALE).integerValue(BigNumber.ROUND_DOWN).toFixed(0);

const normalizeNadoSdkSymbolType = (
	type: EngineSymbolsResponse["symbols"][string]["type"],
	symbol: string,
): NadoSymbol["type"] => {
	if (type === 1 || symbol.toUpperCase().endsWith("-PERP")) {
		return "perp";
	}

	return "spot";
};

const createNadoProductSubscriptions = (
	productId: number,
): Array<{
	productId: number;
	streamType: "best_bid_offer" | "funding_rate" | "book_depth";
}> => [
	{
		productId,
		streamType: "best_bid_offer",
	},
	{
		productId,
		streamType: "funding_rate",
	},
	{
		productId,
		streamType: "book_depth",
	},
];

export const nadoClient = new NadoClient({
	sdkClient: createNadoSdkClient({
		chainEnv: NADO_CHAIN_ENV,
		publicClient: createPublicClient({
			chain: CHAIN_ENV_TO_CHAIN[NADO_CHAIN_ENV],
			transport: http(),
		}) as NadoSdkAccountOptions["publicClient"],
	}),
});
