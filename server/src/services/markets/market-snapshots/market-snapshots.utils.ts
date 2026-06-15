import type { FundingOverviewExchangeCell } from "#services/funding/funding-overview/funding-overview.types";
import { normalizeOverviewSymbol } from "#services/funding/funding-overview/funding-overview.utils";
import type {
	MarketAssetClass,
	MarketContractType,
	MarketSnapshot,
} from "./market-snapshots.types";
import {
	MARKET_BASE_ASSET_ALIASES,
	MARKET_CONTRACT_SUFFIXES,
	MARKET_EQUITY_BASE_ASSETS,
	MARKET_STABLE_QUOTES,
	MARKET_SYNTHETIC_BASE_ASSETS,
	MARKET_TRADABLE_SYMBOL_PATTERN,
} from "./market-snapshots.constants";

/**
 * Converts a funding overview cell into the shared market snapshot shape used
 * by REST bootstrap, live collectors, and spread calculation.
 */
export const mapFundingCellToMarketSnapshot = (
	cell: FundingOverviewExchangeCell,
): MarketSnapshot =>
	enrichMarketSnapshotIdentity({
		exchange: cell.exchange,
		symbol: normalizeOverviewSymbol(cell.sourceSymbol),
		sourceSymbol: cell.sourceSymbol,
		...(cell.fundingRate !== undefined ? { fundingRate: cell.fundingRate } : {}),
		...(cell.apr !== undefined ? { fundingApr: cell.apr } : {}),
		...(cell.fundingIntervalHours !== undefined
			? { fundingIntervalHours: cell.fundingIntervalHours }
			: {}),
		...(cell.bidPrice !== undefined ? { bidPrice: cell.bidPrice } : {}),
		...(cell.askPrice !== undefined ? { askPrice: cell.askPrice } : {}),
		...(cell.bidSize !== undefined ? { bidSize: cell.bidSize } : {}),
		...(cell.askSize !== undefined ? { askSize: cell.askSize } : {}),
		...(cell.markPrice !== undefined ? { markPrice: cell.markPrice } : {}),
		...(cell.indexPrice !== undefined ? { indexPrice: cell.indexPrice } : {}),
		...(cell.midPrice !== undefined ? { midPrice: cell.midPrice } : {}),
		...(cell.openInterest !== undefined ? { openInterest: cell.openInterest } : {}),
		...(cell.volume24h !== undefined ? { volume24h: cell.volume24h } : {}),
		...(cell.makerFeeRate !== undefined ? { makerFeeRate: cell.makerFeeRate } : {}),
		...(cell.takerFeeRate !== undefined ? { takerFeeRate: cell.takerFeeRate } : {}),
		...(cell.feeSource !== undefined ? { feeSource: cell.feeSource } : {}),
		...(cell.maxLeverage !== undefined ? { maxLeverage: cell.maxLeverage } : {}),
		...(cell.minOrderSize !== undefined ? { minOrderSize: cell.minOrderSize } : {}),
		...(cell.maxOrderSize !== undefined ? { maxOrderSize: cell.maxOrderSize } : {}),
		...(cell.timestamp !== undefined ? { timestamp: cell.timestamp } : {}),
	});

/** Filters snapshots by already-normalized symbol while preserving all rows when unset. */
export const filterMarketSnapshotsBySymbol = (
	snapshots: MarketSnapshot[],
	symbol?: string,
): MarketSnapshot[] => {
	if (!symbol) {
		return snapshots;
	}

	return snapshots.filter((snapshot) => snapshot.symbol === symbol);
};

/**
 * Enriches snapshots with inferred base, quote, settlement, contract, and asset
 * class identity while preserving explicit connector-provided identity fields.
 */
export const enrichMarketSnapshotIdentity = (
	snapshot: MarketSnapshot,
): MarketSnapshot => {
	const identity = createMarketIdentity(snapshot.sourceSymbol, snapshot.symbol);

	return {
		...snapshot,
		symbol: identity.baseAsset,
		baseAsset: snapshot.baseAsset ?? identity.baseAsset,
		contractType: snapshot.contractType ?? identity.contractType,
		assetClass: snapshot.assetClass ?? identity.assetClass,
		...(snapshot.quoteAsset !== undefined
			? { quoteAsset: snapshot.quoteAsset }
			: identity.quoteAsset !== undefined
				? { quoteAsset: identity.quoteAsset }
				: {}),
		...(snapshot.settlementAsset !== undefined
			? { settlementAsset: snapshot.settlementAsset }
			: identity.settlementAsset !== undefined
				? { settlementAsset: identity.settlementAsset }
				: {}),
	};
};

const createMarketIdentity = (
	sourceSymbol: string,
	fallbackSymbol: string,
): {
	baseAsset: string;
	quoteAsset?: string;
	settlementAsset?: string;
	contractType: MarketContractType;
	assetClass: MarketAssetClass;
} => {
	const normalizedSourceSymbol = sourceSymbol.trim().toUpperCase();
	const parts = normalizedSourceSymbol.split(/[-_/]/).filter(Boolean);
	const delimitedBaseAsset = normalizeMarketBaseAsset(
		normalizeOverviewSymbol(parts[0] ?? fallbackSymbol),
	);
	const delimitedQuoteAsset = getDelimitedQuoteAsset(parts);
	const compactQuoteAsset = delimitedQuoteAsset === undefined
		? getCompactQuoteAsset(normalizedSourceSymbol)
		: undefined;
	const quoteAsset = delimitedQuoteAsset ?? compactQuoteAsset;
	const baseAsset = normalizeMarketBaseAsset(compactQuoteAsset === undefined
		? delimitedBaseAsset
		: normalizedSourceSymbol.slice(0, -compactQuoteAsset.length));

	return {
		baseAsset,
		contractType: inferContractType(parts),
		assetClass: inferAssetClass(baseAsset),
		...(quoteAsset !== undefined ? { quoteAsset, settlementAsset: quoteAsset } : {}),
	};
};

/** Returns true when a snapshot represents a market eligible for spread comparison. */
export const isComparableMarketSnapshot = (snapshot: MarketSnapshot): boolean =>
	isTradableMarketSymbol(snapshot.symbol) &&
	snapshot.assetClass !== "equity" &&
	snapshot.assetClass !== "synthetic";

/** Returns true when a normalized market symbol can be exposed to trading views. */
export const isTradableMarketSymbol = (symbol: string): boolean =>
	MARKET_TRADABLE_SYMBOL_PATTERN.test(symbol);

const getDelimitedQuoteAsset = (parts: string[]): string | undefined =>
	parts
		.slice(1)
		.find((part) => !MARKET_CONTRACT_SUFFIXES.has(part));

const getCompactQuoteAsset = (sourceSymbol: string): string | undefined =>
	MARKET_STABLE_QUOTES.find((quote) =>
		sourceSymbol.endsWith(quote) &&
		sourceSymbol.length > quote.length,
	);

const inferContractType = (parts: string[]): MarketContractType =>
	parts.some((part) => MARKET_CONTRACT_SUFFIXES.has(part)) ? "perp" : "unknown";

const inferAssetClass = (baseAsset: string): MarketAssetClass =>
	MARKET_EQUITY_BASE_ASSETS.has(baseAsset)
		? "equity"
		: MARKET_SYNTHETIC_BASE_ASSETS.has(baseAsset)
			? "synthetic"
			: "unknown";

const normalizeMarketBaseAsset = (baseAsset: string): string =>
	MARKET_BASE_ASSET_ALIASES.get(baseAsset) ?? baseAsset;
