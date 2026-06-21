import { etherealRestClient } from "#exchanges/ethereal/ethereal";
import { etherealMarketDataStream } from "#exchanges/ethereal/ethereal.ws";
import { nadoClient } from "#exchanges/nado/nado";
import { okxClient } from "#exchanges/okx/okx";
import type { UserExchangeAccount } from "#services/users/user-exchange-accounts/user-exchange-accounts.types";
import type {
	TradingHistoryError,
	TradingHistoryPosition,
	TradingHistoryResponse,
} from "./trading-history.types";
import {
	groupFillsIntoClosedPositions,
	type TradingHistoryFill,
} from "./trading-history.utils";

export const getUserTradingHistory = async (
	accounts: UserExchangeAccount[],
): Promise<TradingHistoryResponse> => {
	const results = await Promise.all(accounts
		.filter((account) => account.status !== "disabled")
		.map(getAccountTradingHistoryResult));

	return {
		errors: results.flatMap((result) => "error" in result ? [result.error] : []),
		positions: results.flatMap((result) => "positions" in result ? result.positions : [])
			.sort((left, right) =>
			right.closedAt.localeCompare(left.closedAt)
		),
	};
};

const getAccountTradingHistoryResult = async (
	account: UserExchangeAccount,
): Promise<
	{ positions: TradingHistoryPosition[] }
	| { error: TradingHistoryError }
> => {
	try {
		return { positions: await getAccountTradingHistory(account) };
	} catch (error) {
		return {
			error: {
				accountId: account.id,
				code: "TRADING_HISTORY_FETCH_FAILED",
				exchange: account.exchange,
				label: account.label,
				message: error instanceof Error ? error.message : "Unable to fetch position history",
			},
		};
	}
};

const getAccountTradingHistory = async (
	account: UserExchangeAccount,
): Promise<TradingHistoryPosition[]> => {
	if (account.publicData.exchange === "ethereal") {
		return getEtherealPositionHistory(account);
	}

	if (account.publicData.exchange === "nado") {
		return getNadoPositionHistory(account);
	}

	if (account.publicData.exchange === "okx") {
		return getOkxPositionHistory(account);
	}

	return [];
};

const getEtherealPositionHistory = async (
	account: UserExchangeAccount,
): Promise<TradingHistoryPosition[]> => {
	if (account.publicData.exchange !== "ethereal") return [];

	const address = account.publicData.address?.trim();

	if (!address) return [];

	const subaccount = await etherealRestClient.resolveSubaccount(
		address,
		account.publicData.subaccountName?.trim() || "primary",
	);

	if (!subaccount) return [];

	etherealMarketDataStream.subscribeToSubaccount(subaccount.id);
	const [positions, productsResponse] = await Promise.all([
		etherealRestClient.getAllPositions(subaccount.id),
		etherealRestClient.getMarkets(),
	]);
	const productsById = new Map(
		(productsResponse?.data ?? []).map((product) => [product.id, product]),
	);
	const histories = await Promise.all(positions.map(async (position) => {
		const sourceSymbol = productsById.get(position.productId)?.ticker ?? position.productId;
		const fills = await etherealRestClient.getPositionFills(position.id);
		const closedPositions = groupFillsIntoClosedPositions(
			fills.map<TradingHistoryFill>((fill) => ({
				id: `${position.id}:${fill.createdAt}:${fill.price}:${fill.filled}`,
				price: fill.price,
				realizedPnlUsd: fill.realizedPnl,
				side: fill.side === 0 ? "buy" : "sell",
				size: fill.filled,
				timestamp: new Date(fill.createdAt).toISOString(),
			})),
			{
				accountId: account.id,
				exchange: "ethereal",
				quoteAsset: "USD",
				sourceSymbol,
				symbol: sourceSymbol.replace(/USD$/u, ""),
			},
		);

		return closedPositions.map((closedPosition, index) => ({
			...closedPosition,
			id: `${account.id}:${position.id}:${index}`,
			realizedPnlUsd: position.realizedPnl,
		}));
	}));

	return histories.flat();
};

const getNadoPositionHistory = async (
	account: UserExchangeAccount,
): Promise<TradingHistoryPosition[]> => {
	if (account.publicData.exchange !== "nado") return [];

	const address = account.publicData.address?.trim();

	if (!address) return [];

	const [trades, symbols] = await Promise.all([
		nadoClient.getTradeHistory({
			subaccountOwner: address,
			subaccountName: account.publicData.subaccountName?.trim() || "default",
		}),
		nadoClient.getSymbols(),
	]);
	const symbolsByProductId = new Map(symbols.map((item) => [item.product_id, item.symbol]));
	const tradesByProductId = new Map<number, typeof trades>();

	for (const trade of trades) {
		const productTrades = tradesByProductId.get(trade.productId) ?? [];

		productTrades.push(trade);
		tradesByProductId.set(trade.productId, productTrades);
	}

	return [...tradesByProductId].flatMap(([productId, productTrades]) => {
		const sourceSymbol = symbolsByProductId.get(productId) ?? `NADO-PERP-${productId}`;

		return groupFillsIntoClosedPositions(
			productTrades.map((trade) => ({
				id: trade.id,
				price: trade.price,
				realizedPnlUsd: trade.realizedPnl,
				side: trade.side,
				size: trade.size,
				timestamp: new Date(Number(trade.timestamp) * 1_000).toISOString(),
			})),
			{
				accountId: account.id,
				exchange: "nado",
				quoteAsset: "USDT0",
				sourceSymbol,
				symbol: sourceSymbol.split("-")[0] ?? sourceSymbol,
			},
		);
	});
};

const getOkxPositionHistory = async (
	account: UserExchangeAccount,
): Promise<TradingHistoryPosition[]> => {
	if (account.publicData.exchange !== "okx") return [];

	const { apiKey, apiSecret, passphrase } = account.publicData;

	if (!apiKey?.trim() || !apiSecret?.trim() || !passphrase?.trim()) return [];

	const positions = await okxClient.getPositionHistory({
		apiKey: apiKey.trim(),
		apiSecret: apiSecret.trim(),
		passphrase: passphrase.trim(),
	});

	return positions
		.filter((position) => ["2", "3", "6"].includes(position.type))
		.map((position) => ({
			accountId: account.id,
			closedAt: new Date(Number(position.uTime)).toISOString(),
			entryPrice: position.openAvgPx,
			exchange: "okx",
			exitPrice: position.closeAvgPx,
			id: `${account.id}:${position.posId}:${position.uTime}`,
			openedAt: new Date(Number(position.cTime)).toISOString(),
			quoteAsset: position.instId.split("-")[1] === "USDC" ? "USDC" : "USDT",
			realizedPnlUsd: position.realizedPnl,
			side: position.direction,
			size: position.openMaxPos || position.closeTotalPos,
			sourceSymbol: position.instId,
			symbol: position.instId.split("-")[0] ?? position.instId,
		}));
};
