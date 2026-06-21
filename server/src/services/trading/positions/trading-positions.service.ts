import { hyperliquidRestClient } from "#exchanges/hyperliquid/hyperliquid";
import { etherealRestClient } from "#exchanges/ethereal/ethereal";
import {
	getEtherealAccountPositions,
	replaceEtherealAccountPositions,
} from "#exchanges/ethereal/ethereal-account-state.store";
import { etherealMarketDataStream } from "#exchanges/ethereal/ethereal.ws";
import type { EtherealAccountPosition, ProductData } from "#exchanges/ethereal/ethereal.types";
import type { HyperliquidClearinghouseState } from "#exchanges/hyperliquid/hyperliquid.types";
import { okxClient } from "#exchanges/okx/okx";
import type { OkxPosition } from "#exchanges/okx/okx.types";
import { nadoClient } from "#exchanges/nado/nado";
import type { NadoSubaccountBalance } from "#exchanges/nado/nado.types";
import { pacificaRestClient } from "#exchanges/pacifica/pacifica";
import type { PacificaPosition } from "#exchanges/pacifica/pacifica.types";
import type { UserExchangeAccount } from "#services/users/user-exchange-accounts/user-exchange-accounts.types";
import type {
	TradingPosition,
	TradingPositionError,
	TradingPositionsResponse,
} from "./trading-positions.types";

/** Aggregates normalized open positions from active saved exchange accounts. */
export const getUserTradingPositions = async (
	accounts: UserExchangeAccount[],
): Promise<TradingPositionsResponse> => {
	const activeAccounts = accounts.filter((account) => account.status !== "disabled");
	const results = await Promise.all(activeAccounts.map(getAccountTradingPositions));

	return results.reduce<TradingPositionsResponse>(
		(response, result) => {
			if ("error" in result) {
				response.errors.push(result.error);
			} else {
				response.positions.push(...result.positions);
			}

			return response;
		},
		{ positions: [], errors: [] },
	);
};

const getAccountTradingPositions = async (
	account: UserExchangeAccount,
): Promise<{ positions: TradingPosition[] } | { error: TradingPositionError }> => {
	try {
		if (account.publicData.exchange === "ethereal") {
			const address = account.publicData.address?.trim();

			if (!address) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					"Ethereal wallet address is required",
				);
			}

			const subaccount = await etherealRestClient.resolveSubaccount(
				address,
				account.publicData.subaccountName?.trim() || "primary",
			);

			if (!subaccount) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					"Ethereal subaccount was not found for this wallet",
				);
			}

			etherealMarketDataStream.subscribeToSubaccount(subaccount.id);
			const products = (await etherealRestClient.getMarkets())?.data ?? [];
			const productsById = new Map(products.map((product) => [product.id, product]));
			let positions = getEtherealAccountPositions(subaccount.id);

			if (
				positions === undefined
				|| positions.some((position) => position.liquidationPrice === undefined)
			) {
				const restPositions = (await etherealRestClient.getPositions(subaccount.id))
					.map((position) => ({
						cost: position.cost,
						feesAccruedUsd: position.feesAccruedUsd,
						fundingAccruedUsd: position.fundingAccruedUsd,
						id: position.id,
						...(position.liquidationPrice
							? { liquidationPrice: position.liquidationPrice }
							: {}),
						productId: position.productId,
						sourceSymbol: productsById.get(position.productId)?.ticker,
						realizedPnl: position.realizedPnl,
						side: position.side,
						size: position.size,
						subaccountId: subaccount.id,
						unrealizedPnl: position.unrealizedPnl,
						updatedAt: position.updatedAt,
					}));
				const restPositionsById = new Map(
					restPositions.map((position) => [position.id, position]),
				);

				positions = positions === undefined
					? restPositions
					: positions.map((position) => {
						const restPosition = restPositionsById.get(position.id);

						return restPosition?.liquidationPrice === undefined
							? position
							: { ...position, liquidationPrice: restPosition.liquidationPrice };
					});
				replaceEtherealAccountPositions(subaccount.id, positions);
			}

			return { positions: mapEtherealPositions(account, positions, products) };
		}

		if (account.publicData.exchange === "hyperliquid") {
			const address = account.publicData.address?.trim();

			if (!address) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					"Hyperliquid account address is required",
				);
			}

			const state = await hyperliquidRestClient.getClearinghouseState(address);

			return { positions: mapHyperliquidPositions(account, state) };
		}

		if (account.publicData.exchange === "okx") {
			const { apiKey, apiSecret, passphrase } = account.publicData;

			if (!apiKey?.trim() || !apiSecret?.trim() || !passphrase?.trim()) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					"OKX apiKey, apiSecret, and passphrase are required",
				);
			}

			const positions = await okxClient.getPositions({
				apiKey: apiKey.trim(),
				apiSecret: apiSecret.trim(),
				passphrase: passphrase.trim(),
			});

			return { positions: mapOkxPositions(account, positions) };
		}

		if (account.publicData.exchange === "nado") {
			const address = account.publicData.address?.trim();
			const subaccountName = account.publicData.subaccountName?.trim() || "default";

			if (!address) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					"Nado owner wallet address is required",
				);
			}

			const summary = await nadoClient.getSubaccountSummary({
				subaccountName,
				subaccountOwner: address,
			});

			if (!summary.exists) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					`Nado subaccount "${subaccountName}" was not found for this wallet`,
				);
			}

			return { positions: mapNadoPositions(account, summary.balances) };
		}

		if (account.publicData.exchange === "pacifica") {
			const address = account.publicData.accountAddress?.trim();

			if (!address) {
				throw new TradingPositionsError(
					"TRADING_POSITIONS_CREDENTIALS_REQUIRED",
					"Pacifica account address is required",
				);
			}

			return {
				positions: mapPacificaPositions(
					account,
					await pacificaRestClient.getPositions(address),
				),
			};
		}

		throw new TradingPositionsError(
			"TRADING_POSITIONS_UNSUPPORTED",
			getUnsupportedPositionsMessage(account.exchange),
		);
	} catch (error) {
		return {
			error: {
				accountId: account.id,
				exchange: account.exchange,
				label: account.label,
				code: error instanceof TradingPositionsError
					? error.code
					: "TRADING_POSITIONS_FETCH_FAILED",
				message: error instanceof Error ? error.message : "Unable to fetch positions",
			},
		};
	}
};

const mapEtherealPositions = (
	account: UserExchangeAccount,
	positions: EtherealAccountPosition[],
	products: ProductData[],
): TradingPosition[] => {
	const productsById = new Map(products.map((product) => [product.id, product]));

	return positions.flatMap((position) => {
		const size = Number.parseFloat(position.size);
		const cost = Number.parseFloat(position.cost);
		const unrealizedPnl = Number.parseFloat(position.unrealizedPnl ?? "");

		if (!Number.isFinite(size) || size === 0) return [];

		const product = position.productId ? productsById.get(position.productId) : undefined;
		const sourceSymbol = position.sourceSymbol ?? product?.ticker ?? position.productId ?? position.id;
		const entryPrice = Number.isFinite(cost) ? Math.abs(cost / size) : undefined;
		const markPrice = Number.isFinite(cost) && Number.isFinite(unrealizedPnl)
			? (cost + (position.side === 0 ? unrealizedPnl : -unrealizedPnl)) / Math.abs(size)
			: undefined;

		return [{
			id: createPositionId(account.id, sourceSymbol, position.side === 0 ? "long" : "short"),
			accountId: account.id,
			exchange: "ethereal",
			label: account.label,
			symbol: normalizePositionSymbol(sourceSymbol.replace(/USD$/u, "")),
			sourceSymbol,
			quoteAsset: "USD",
			side: position.side === 0 ? "long" : "short",
			size: getAbsoluteDecimal(position.size),
			...(entryPrice === undefined ? {} : { entryPrice: String(entryPrice) }),
			...(markPrice === undefined ? {} : { markPrice: String(markPrice) }),
			...(position.liquidationPrice === undefined
				? {}
				: { liquidationPrice: position.liquidationPrice }),
			...(markPrice === undefined ? {} : { notionalUsd: String(Math.abs(size * markPrice)) }),
			...(position.unrealizedPnl === undefined
				? {}
				: { unrealizedPnlUsd: position.unrealizedPnl }),
			updatedAt: new Date(position.updatedAt).toISOString(),
		}];
	});
};

const mapHyperliquidPositions = (
	account: UserExchangeAccount,
	state: HyperliquidClearinghouseState,
): TradingPosition[] =>
	(state.assetPositions ?? []).flatMap(({ position }) => {
		const side = getSignedPositionSide(position.szi);

		if (side === undefined) {
			return [];
		}

		return [{
			id: createPositionId(account.id, position.coin, side),
			accountId: account.id,
			exchange: "hyperliquid",
			label: account.label,
			symbol: normalizePositionSymbol(position.coin),
			sourceSymbol: position.coin,
			quoteAsset: "USDC",
			side,
			size: getAbsoluteDecimal(position.szi),
			...(position.entryPx ? { entryPrice: position.entryPx } : {}),
			...(position.liquidationPx ? { liquidationPrice: position.liquidationPx } : {}),
			leverage: position.leverage.value,
			marginMode: position.leverage.type,
			marginUsed: position.marginUsed,
			notionalUsd: position.positionValue,
			unrealizedPnlUsd: position.unrealizedPnl,
			...toOptionalNumberField("returnOnEquity", position.returnOnEquity),
		}];
	});

const mapOkxPositions = (
	account: UserExchangeAccount,
	positions: OkxPosition[],
): TradingPosition[] =>
	positions.flatMap((position) => {
		const side = getOkxPositionSide(position);

		if (side === undefined) {
			return [];
		}

		return [{
			id: createPositionId(account.id, position.instId, side),
			accountId: account.id,
			exchange: "okx",
			label: account.label,
			symbol: normalizePositionSymbol(position.instId),
			sourceSymbol: position.instId,
			quoteAsset: getOkxQuoteAsset(position.instId),
			side,
			size: getAbsoluteDecimal(position.pos),
			...(position.avgPx ? { entryPrice: position.avgPx } : {}),
			...(position.markPx ? { markPrice: position.markPx } : {}),
			...(position.liqPx ? { liquidationPrice: position.liqPx } : {}),
			...toOptionalNumberField("leverage", position.lever),
			...toOptionalMarginMode(position.mgnMode),
			...(position.margin ?? position.imr
				? { marginUsed: position.margin ?? position.imr }
				: {}),
			...(position.notionalUsd ? { notionalUsd: position.notionalUsd } : {}),
			...(position.upl ? { unrealizedPnlUsd: position.upl } : {}),
			...toOptionalNumberField("returnOnEquity", position.uplRatio),
			...(position.uTime
				? { updatedAt: new Date(Number(position.uTime)).toISOString() }
				: {}),
		}];
	});

const mapNadoPositions = (
	account: UserExchangeAccount,
	balances: NadoSubaccountBalance[],
): TradingPosition[] =>
	balances.flatMap((balance) => {
		if (balance.type !== "perp") {
			return [];
		}

		const side = getSignedPositionSide(balance.amount);

		if (side === undefined) {
			return [];
		}

		const sourceSymbol = balance.symbol ?? `NADO-PERP-${balance.productId}`;
		const nadoMetrics = getNadoPositionMetrics(balance);

		return [{
			id: createPositionId(account.id, sourceSymbol, side),
			accountId: account.id,
			exchange: "nado",
			label: account.label,
			symbol: normalizePositionSymbol(sourceSymbol),
			sourceSymbol,
			quoteAsset: "USDT0",
			side,
			size: getAbsoluteDecimal(balance.amount),
			marginMode: "cross",
			...nadoMetrics,
			...(balance.markPrice ? { markPrice: balance.markPrice } : {}),
			...(balance.valueUsd === undefined
				? {}
				: { notionalUsd: String(Math.abs(balance.valueUsd)) }),
		}];
	});

const mapPacificaPositions = (
	account: UserExchangeAccount,
	positions: PacificaPosition[],
): TradingPosition[] =>
	positions.flatMap((position) => {
		const side = position.side === "bid"
			? "long"
			: position.side === "ask" ? "short" : undefined;

		if (side === undefined || !isNonZeroPositionSize(position.amount)) {
			return [];
		}

		return [{
			id: createPositionId(account.id, position.symbol, side),
			accountId: account.id,
			exchange: "pacifica",
			label: account.label,
			symbol: normalizePositionSymbol(position.symbol),
			sourceSymbol: position.symbol,
			quoteAsset: "USDC",
			side,
			size: getAbsoluteDecimal(position.amount),
			entryPrice: position.entry_price,
			...(position.liquidation_price
				? { liquidationPrice: position.liquidation_price }
				: {}),
			marginMode: position.isolated ? "isolated" : "cross",
			...(position.isolated && position.margin ? { marginUsed: position.margin } : {}),
			updatedAt: new Date(position.updated_at).toISOString(),
		}];
	});

const getOkxPositionSide = (position: OkxPosition) => {
	if (position.posSide === "long" || position.posSide === "short") {
		return position.posSide;
	}

	return getSignedPositionSide(position.pos);
};

const getOkxQuoteAsset = (sourceSymbol: string): "USDC" | "USDT" =>
	sourceSymbol.toUpperCase().split("-")[1] === "USDC" ? "USDC" : "USDT";

/** Uses Nado's tracked open-position cost basis and mark price. */
const getNadoPositionMetrics = (
	balance: NadoSubaccountBalance,
): Pick<TradingPosition, "entryPrice" | "unrealizedPnlUsd"> => {
	const amount = Number.parseFloat(balance.amount);
	const markPrice = Number.parseFloat(balance.markPrice ?? "");
	const netEntryUnrealized = Number.parseFloat(balance.netEntryUnrealized ?? "");

	if (
		!Number.isFinite(amount)
		|| amount === 0
		|| !Number.isFinite(netEntryUnrealized)
	) {
		return {};
	}

	const entryPrice = Math.abs(netEntryUnrealized / amount);

	return {
		entryPrice: String(entryPrice),
		...(Number.isFinite(markPrice)
			? { unrealizedPnlUsd: String(amount * markPrice - netEntryUnrealized) }
			: {}),
	};
};

const getSignedPositionSide = (size: string): "long" | "short" | undefined => {
	const numericSize = Number.parseFloat(size);

	if (!Number.isFinite(numericSize) || numericSize === 0) {
		return undefined;
	}

	return numericSize > 0 ? "long" : "short";
};

const isNonZeroPositionSize = (size: string): boolean => {
	const numericSize = Number.parseFloat(size);

	return Number.isFinite(numericSize) && numericSize !== 0;
};

const getAbsoluteDecimal = (value: string): string =>
	value.trim().startsWith("-") ? value.trim().slice(1) : value.trim();

const normalizePositionSymbol = (sourceSymbol: string): string =>
	sourceSymbol.trim().toUpperCase().split("-")[0] ?? sourceSymbol;

const createPositionId = (
	accountId: string,
	sourceSymbol: string,
	side: "long" | "short",
): string => `${accountId}:${sourceSymbol}:${side}`;

const toOptionalNumberField = <TKey extends string>(key: TKey, value?: string) => {
	if (!value) {
		return {};
	}

	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed) ? { [key]: parsed } as Record<TKey, number> : {};
};

const toOptionalMarginMode = (
	value?: string,
): { marginMode?: "cross" | "isolated" } =>
	value === "cross" || value === "isolated" ? { marginMode: value } : {};

const getUnsupportedPositionsMessage = (
	exchange: UserExchangeAccount["exchange"],
): string => {
	if (exchange === "variational") {
		return "Variational trading API is not available to users yet";
	}

	return `${exchange} position reads are not supported yet`;
};

class TradingPositionsError extends Error {
	constructor(
		readonly code: TradingPositionError["code"],
		message: string,
	) {
		super(message);
		this.name = "TradingPositionsError";
	}
}
