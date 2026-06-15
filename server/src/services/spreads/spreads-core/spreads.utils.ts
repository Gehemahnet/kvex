import type { MarketSnapshot } from "#services/markets/market-snapshots/market-snapshots.types";
import { isComparableMarketSnapshot } from "#services/markets/market-snapshots/market-snapshots.utils";
import {
	DEFAULT_SPREAD_MAX_SNAPSHOT_AGE_MS,
	SPREAD_CONFIDENCE_BBO_SPREAD,
	SPREAD_CONFIDENCE_MAX_SCORE,
	SPREAD_CONFIDENCE_MIN_SCORE,
	SPREAD_CONFIDENCE_PRICE_SOURCE_SCORE,
	SPREAD_CONFIDENCE_WEIGHTS,
} from "#services/spreads/spreads-core/spreads.constants";
import type {
	SpreadOpportunity,
	SpreadConfidenceBreakdown,
	SpreadExecutableNotionalReason,
	SpreadPriceSource,
	SpreadSide,
} from "#services/spreads/spreads-core/spreads.types";

type SpreadPrice = {
	price: number;
	source: SpreadPriceSource;
	slippagePercent?: number;
};
type ExecutableSpreadPrice = SpreadPrice;

type SpreadPricePair = {
	longSnapshot: MarketSnapshot;
	longPrice: ExecutableSpreadPrice;
	shortSnapshot: MarketSnapshot;
	shortPrice: ExecutableSpreadPrice;
};

type BboMetrics = {
	isValid: boolean;
	spreadPercent?: number;
};

type ExecutableNotional = {
	value?: number;
	reason: SpreadExecutableNotionalReason;
};

type BookSide = "bid" | "ask";

type BookLevel = {
	price: number;
	size: number;
};

type ExecutionFill = {
	price: number;
	source: "depth" | "bbo";
	slippagePercent: number;
};

/**
 * Creates one directed spread opportunity from two comparable market snapshots.
 * It chooses executable prices when possible, applies notional and freshness
 * filters, and attaches confidence, fee, funding, and slippage metadata.
 */
export const createSpreadOpportunity = (
	first: MarketSnapshot,
	second: MarketSnapshot,
	options: {
		maxSnapshotAgeMs?: number;
		now?: number;
		positionSizeUsd?: number;
		holdingPeriodHours?: number;
	} = {},
): SpreadOpportunity | undefined => {
	if (first.symbol !== second.symbol) {
		return undefined;
	}

	if (
		!isComparableMarketSnapshot(first) ||
		!isComparableMarketSnapshot(second)
	) {
		return undefined;
	}

	if (!areMarketIdentitiesCompatible(first, second)) {
		return undefined;
	}

	const prices = getSpreadPrices(first, second, options.positionSizeUsd);

	if (prices === undefined) {
		return undefined;
	}

	if (prices.longPrice.price <= 0 || prices.shortPrice.price <= 0) {
		return undefined;
	}

	const {
		longSnapshot,
		longPrice,
		shortSnapshot,
		shortPrice,
	} = prices;

	const now = options.now ?? Date.now();
	const maxSnapshotAgeMs =
		options.maxSnapshotAgeMs ?? DEFAULT_SPREAD_MAX_SNAPSHOT_AGE_MS;
	const priceSpread = shortPrice.price - longPrice.price;
	const maxExecutableNotional = createMaxExecutableNotional(
		longSnapshot,
		shortSnapshot,
	);

	if (
		options.positionSizeUsd !== undefined &&
		(maxExecutableNotional.value === undefined ||
			maxExecutableNotional.value < options.positionSizeUsd)
	) {
		return undefined;
	}

	const fundingAprSpread = createFundingAprSpread(longSnapshot, shortSnapshot);
	const fundingImpactPercent = createFundingImpactPercent(
		longSnapshot,
		shortSnapshot,
		options.holdingPeriodHours,
	);
	const executionSlippagePercent = createExecutionSlippagePercent(
		longPrice,
		shortPrice,
	);
	const feeAdjustedPriceSpreadPercent = createFeeAdjustedPriceSpreadPercent(
		priceSpread / longPrice.price,
		longSnapshot,
		shortSnapshot,
	);
	const estimatedNetSpreadPercent = createEstimatedNetSpreadPercent(
		feeAdjustedPriceSpreadPercent,
		fundingImpactPercent,
	);
	const isStale = isSpreadStale(
		[longSnapshot, shortSnapshot],
		now,
		maxSnapshotAgeMs,
	);
	const confidenceBreakdown = createSpreadConfidenceBreakdown({
		longPrice,
		shortPrice,
		maxSnapshotAgeMs,
		now,
		snapshots: [longSnapshot, shortSnapshot],
	});

	return {
		symbol: first.symbol,
		long: createSpreadSide(longSnapshot, longPrice, now),
		short: createSpreadSide(shortSnapshot, shortPrice, now),
		priceSpread,
		priceSpreadPercent: priceSpread / longPrice.price,
		...(executionSlippagePercent !== undefined
			? { executionSlippagePercent }
			: {}),
		confidence: createSpreadConfidence(confidenceBreakdown),
		confidenceBreakdown,
		isStale,
		maxExecutableNotionalReason: maxExecutableNotional.reason,
		...(maxExecutableNotional.value !== undefined
			? { maxExecutableNotionalUsd: maxExecutableNotional.value }
			: {}),
		...(feeAdjustedPriceSpreadPercent !== undefined
			? { feeAdjustedPriceSpreadPercent }
			: {}),
		...(fundingAprSpread !== undefined ? { fundingAprSpread } : {}),
		...(fundingImpactPercent !== undefined ? { fundingImpactPercent } : {}),
		...(estimatedNetSpreadPercent !== undefined
			? { estimatedNetSpreadPercent }
			: {}),
	};
};

/** Chooses the best available direction using executable prices before fallbacks. */
const getSpreadPrices = (
	first: MarketSnapshot,
	second: MarketSnapshot,
	positionSizeUsd?: number,
): SpreadPricePair | undefined => {
	const executableFirstToSecond = getExecutableSpreadPrices(
		first,
		second,
		positionSizeUsd,
	);
	const executableSecondToFirst = getExecutableSpreadPrices(
		second,
		first,
		positionSizeUsd,
	);

	if (executableFirstToSecond && executableSecondToFirst) {
		return executableFirstToSecond.shortPrice.price -
			executableFirstToSecond.longPrice.price >=
			executableSecondToFirst.shortPrice.price -
				executableSecondToFirst.longPrice.price
			? executableFirstToSecond
			: executableSecondToFirst;
	}

	if (executableFirstToSecond) {
		return executableFirstToSecond;
	}

	if (executableSecondToFirst) {
		return executableSecondToFirst;
	}

	return getIndicativeSpreadPrices(first, second);
};

/** Ensures explicitly known market identities do not contradict each other. */
const areMarketIdentitiesCompatible = (
	first: MarketSnapshot,
	second: MarketSnapshot,
): boolean =>
	areOptionalValuesCompatible(first.baseAsset, second.baseAsset) &&
	areOptionalValuesCompatible(first.quoteAsset, second.quoteAsset) &&
	areOptionalValuesCompatible(first.settlementAsset, second.settlementAsset) &&
	areOptionalValuesCompatible(first.contractType, second.contractType) &&
	areOptionalValuesCompatible(first.assetClass, second.assetClass);

const areOptionalValuesCompatible = (
	first?: string,
	second?: string,
): boolean =>
	first === undefined ||
	second === undefined ||
	first === "unknown" ||
	second === "unknown" ||
	first === second;

/** Creates long/short prices from ask-to-buy and bid-to-sell execution data. */
const getExecutableSpreadPrices = (
	longSnapshot: MarketSnapshot,
	shortSnapshot: MarketSnapshot,
	positionSizeUsd?: number,
): SpreadPricePair | undefined => {
	if (
		!hasValidBbo(longSnapshot) ||
		!hasValidBbo(shortSnapshot)
	) {
		return undefined;
	}

	const longExecution = createExecutionFill(
		longSnapshot,
		"ask",
		positionSizeUsd,
	);
	const shortExecution = createExecutionFill(
		shortSnapshot,
		"bid",
		positionSizeUsd,
	);

	if (longExecution === undefined || shortExecution === undefined) {
		return undefined;
	}

	return {
		longSnapshot,
		longPrice: {
			price: longExecution.price,
			source: longExecution.source,
			slippagePercent: longExecution.slippagePercent,
		},
		shortSnapshot,
		shortPrice: {
			price: shortExecution.price,
			source: shortExecution.source,
			slippagePercent: shortExecution.slippagePercent,
		},
	};
};

/** Falls back to indicative mark, mid, or index prices when BBO is unusable. */
const getIndicativeSpreadPrices = (
	first: MarketSnapshot,
	second: MarketSnapshot,
): SpreadPricePair | undefined => {
	const firstPrice = getIndicativeSnapshotPrice(first);
	const secondPrice = getIndicativeSnapshotPrice(second);

	if (firstPrice === undefined || secondPrice === undefined) {
		return undefined;
	}

	return firstPrice.price <= secondPrice.price
		? {
			longSnapshot: first,
			longPrice: firstPrice,
			shortSnapshot: second,
			shortPrice: secondPrice,
		}
		: {
			longSnapshot: second,
			longPrice: secondPrice,
			shortSnapshot: first,
			shortPrice: firstPrice,
		};
};

/** Selects the best single indicative price exposed by a snapshot. */
const getIndicativeSnapshotPrice = (
	snapshot: MarketSnapshot,
): SpreadPrice | undefined => {
	if (snapshot.markPrice !== undefined) {
		return {
			price: snapshot.markPrice,
			source: "mark",
		};
	}

	if (snapshot.midPrice !== undefined) {
		return {
			price: snapshot.midPrice,
			source: "mid",
		};
	}

	if (snapshot.indexPrice !== undefined) {
		return {
			price: snapshot.indexPrice,
			source: "index",
		};
	}

	return undefined;
};

/** Converts a source snapshot and selected price into API side metadata. */
const createSpreadSide = (
	snapshot: MarketSnapshot,
	price: SpreadPrice,
	now: number,
): SpreadSide => {
	const priceFreshnessTimestamp = getPriceFreshnessTimestamp(snapshot);
	const fundingFreshnessTimestamp = getFundingFreshnessTimestamp(snapshot);
	const liquidityFreshnessTimestamp = getLiquidityFreshnessTimestamp(snapshot);

	return {
		exchange: snapshot.exchange,
		symbol: snapshot.sourceSymbol,
		...(snapshot.baseAsset !== undefined ? { baseAsset: snapshot.baseAsset } : {}),
		...(snapshot.quoteAsset !== undefined ? { quoteAsset: snapshot.quoteAsset } : {}),
		...(snapshot.settlementAsset !== undefined
			? { settlementAsset: snapshot.settlementAsset }
			: {}),
		...(snapshot.contractType !== undefined
			? { contractType: snapshot.contractType }
			: {}),
		...(snapshot.assetClass !== undefined ? { assetClass: snapshot.assetClass } : {}),
		price: price.price,
		priceSource: price.source,
		...(snapshot.bidPrice !== undefined ? { bidPrice: snapshot.bidPrice } : {}),
		...(snapshot.askPrice !== undefined ? { askPrice: snapshot.askPrice } : {}),
		...(snapshot.bidSize !== undefined ? { bidSize: snapshot.bidSize } : {}),
		...(snapshot.askSize !== undefined ? { askSize: snapshot.askSize } : {}),
		...(snapshot.orderBookBids !== undefined
			? { orderBookBidLevels: snapshot.orderBookBids.length }
			: {}),
		...(snapshot.orderBookAsks !== undefined
			? { orderBookAskLevels: snapshot.orderBookAsks.length }
			: {}),
		...(price.slippagePercent !== undefined
			? { slippagePercent: price.slippagePercent }
			: {}),
		...(snapshot.fundingRate !== undefined
			? { fundingRate: snapshot.fundingRate }
			: {}),
		...(snapshot.fundingApr !== undefined ? { fundingApr: snapshot.fundingApr } : {}),
		...(snapshot.fundingIntervalHours !== undefined
			? { fundingIntervalHours: snapshot.fundingIntervalHours }
			: {}),
		...(snapshot.makerFeeRate !== undefined
			? { makerFeeRate: snapshot.makerFeeRate }
			: {}),
		...(snapshot.takerFeeRate !== undefined
			? { takerFeeRate: snapshot.takerFeeRate }
			: {}),
		...(snapshot.feeSource !== undefined ? { feeSource: snapshot.feeSource } : {}),
		...(snapshot.timestamp !== undefined ? { timestamp: snapshot.timestamp } : {}),
		...(snapshot.receivedAt !== undefined ? { receivedAt: snapshot.receivedAt } : {}),
		...(snapshot.priceReceivedAt !== undefined
			? { priceReceivedAt: snapshot.priceReceivedAt }
			: {}),
		...(snapshot.fundingReceivedAt !== undefined
			? { fundingReceivedAt: snapshot.fundingReceivedAt }
			: {}),
		...(snapshot.liquidityReceivedAt !== undefined
			? { liquidityReceivedAt: snapshot.liquidityReceivedAt }
			: {}),
		...(priceFreshnessTimestamp !== undefined
			? {
				ageMs: Math.max(0, now - priceFreshnessTimestamp),
				priceAgeMs: Math.max(0, now - priceFreshnessTimestamp),
			}
			: {}),
		...(fundingFreshnessTimestamp !== undefined
			? { fundingAgeMs: Math.max(0, now - fundingFreshnessTimestamp) }
			: {}),
		...(liquidityFreshnessTimestamp !== undefined
			? { liquidityAgeMs: Math.max(0, now - liquidityFreshnessTimestamp) }
			: {}),
	};
};

/** Computes annualized funding APR difference between short and long legs. */
const createFundingAprSpread = (
	longSnapshot: MarketSnapshot,
	shortSnapshot: MarketSnapshot,
): number | undefined => {
	if (
		longSnapshot.fundingApr === undefined ||
		shortSnapshot.fundingApr === undefined
	) {
		return undefined;
	}

	return shortSnapshot.fundingApr - longSnapshot.fundingApr;
};

/** Computes funding impact for the selected holding period using hourly rates. */
const createFundingImpactPercent = (
	longSnapshot: MarketSnapshot,
	shortSnapshot: MarketSnapshot,
	holdingPeriodHours?: number,
): number | undefined => {
	if (
		holdingPeriodHours === undefined ||
		holdingPeriodHours <= 0 ||
		longSnapshot.fundingRate === undefined ||
		shortSnapshot.fundingRate === undefined
	) {
		return undefined;
	}

	return (shortSnapshot.fundingRate - longSnapshot.fundingRate) *
		holdingPeriodHours;
};

const createEstimatedNetSpreadPercent = (
	feeAdjustedPriceSpreadPercent?: number,
	fundingImpactPercent?: number,
): number | undefined =>
	feeAdjustedPriceSpreadPercent === undefined ||
	fundingImpactPercent === undefined
		? undefined
		: feeAdjustedPriceSpreadPercent + fundingImpactPercent;

/** Subtracts both taker fees from the raw price spread ratio. */
const createFeeAdjustedPriceSpreadPercent = (
	priceSpreadPercent: number,
	longSnapshot: MarketSnapshot,
	shortSnapshot: MarketSnapshot,
): number | undefined => {
	if (
		longSnapshot.takerFeeRate === undefined ||
		shortSnapshot.takerFeeRate === undefined
	) {
		return undefined;
	}

	return priceSpreadPercent - longSnapshot.takerFeeRate - shortSnapshot.takerFeeRate;
};

/** Aggregates execution slippage from both long and short legs. */
const createExecutionSlippagePercent = (
	longPrice: ExecutableSpreadPrice,
	shortPrice: ExecutableSpreadPrice,
): number | undefined => {
	if (
		longPrice.slippagePercent === undefined &&
		shortPrice.slippagePercent === undefined
	) {
		return undefined;
	}

	return (longPrice.slippagePercent ?? 0) + (shortPrice.slippagePercent ?? 0);
};

/** Computes the known executable notional cap across both trade legs. */
const createMaxExecutableNotional = (
	longSnapshot: MarketSnapshot,
	shortSnapshot: MarketSnapshot,
): ExecutableNotional => {
	if (longSnapshot.askPrice === undefined) {
		return { reason: "missing-long-ask" };
	}

	const longNotional = createExecutableSideNotional(longSnapshot, "ask");

	if (longNotional === undefined) {
		return { reason: "missing-long-ask-size" };
	}

	if (shortSnapshot.bidPrice === undefined) {
		return { reason: "missing-short-bid" };
	}

	const shortNotional = createExecutableSideNotional(shortSnapshot, "bid");

	if (shortNotional === undefined) {
		return { reason: "missing-short-bid-size" };
	}

	return {
		value: Math.min(longNotional, shortNotional),
		reason: "available",
	};
};

/** Computes executable notional for one side from depth or top-of-book size. */
const createExecutableSideNotional = (
	snapshot: MarketSnapshot,
	side: BookSide,
): number | undefined => {
	const levels = getExecutionLevels(snapshot, side);

	return levels.length === 0
		? undefined
		: levels.reduce((sum, level) => sum + level.price * level.size, 0);
};

/** Creates a weighted execution fill for one side of the requested notional. */
const createExecutionFill = (
	snapshot: MarketSnapshot,
	side: BookSide,
	positionSizeUsd?: number,
): ExecutionFill | undefined => {
	const topPrice = side === "ask" ? snapshot.askPrice : snapshot.bidPrice;

	if (topPrice === undefined || topPrice <= 0) {
		return undefined;
	}

	if (positionSizeUsd === undefined || positionSizeUsd <= 0) {
		return {
			price: topPrice,
			source: "bbo",
			slippagePercent: 0,
		};
	}

	const levels = getExecutionLevels(snapshot, side);

	if (levels.length === 0) {
		return undefined;
	}

	const fill = fillNotional(levels, positionSizeUsd);

	if (fill === undefined) {
		return undefined;
	}

	const slippagePercent = side === "ask"
		? fill.price / topPrice - 1
		: 1 - fill.price / topPrice;

	return {
		price: fill.price,
		source: fill.consumedLevels > 1 ? "depth" : "bbo",
		slippagePercent: Math.max(0, slippagePercent),
	};
};

/** Returns sorted execution levels, falling back to top-of-book when needed. */
const getExecutionLevels = (
	snapshot: MarketSnapshot,
	side: BookSide,
): BookLevel[] => {
	const levels = side === "ask" ? snapshot.orderBookAsks : snapshot.orderBookBids;
	const fallbackPrice = side === "ask" ? snapshot.askPrice : snapshot.bidPrice;
	const fallbackSize = side === "ask" ? snapshot.askSize : snapshot.bidSize;

	if (levels !== undefined && levels.length > 0) {
		return levels
			.filter((level) => level.price > 0 && level.size > 0)
			.sort((first, second) =>
				side === "ask"
					? first.price - second.price
					: second.price - first.price,
			);
	}

	if (fallbackPrice === undefined || fallbackSize === undefined) {
		return [];
	}

	return [{ price: fallbackPrice, size: fallbackSize }];
};

/** Fills a USD notional through order book levels and returns average price. */
const fillNotional = (
	levels: BookLevel[],
	positionSizeUsd: number,
): {
	price: number;
	consumedLevels: number;
} | undefined => {
	let remainingNotional = positionSizeUsd;
	let filledNotional = 0;
	let filledSize = 0;
	let consumedLevels = 0;

	for (const level of levels) {
		if (remainingNotional <= 0) {
			break;
		}

		const levelNotional = level.price * level.size;
		const consumedNotional = Math.min(remainingNotional, levelNotional);

		if (consumedNotional <= 0) {
			continue;
		}

		filledNotional += consumedNotional;
		filledSize += consumedNotional / level.price;
		remainingNotional -= consumedNotional;
		consumedLevels += 1;
	}

	if (remainingNotional > 1e-9 || filledSize <= 0) {
		return undefined;
	}

	return {
		price: filledNotional / filledSize,
		consumedLevels,
	};
};

/** Builds weighted confidence components used by API and frontend tooltips. */
const createSpreadConfidenceBreakdown = (params: {
	longPrice: { source: SpreadPriceSource };
	shortPrice: { source: SpreadPriceSource };
	maxSnapshotAgeMs: number;
	now: number;
	snapshots: MarketSnapshot[];
}): SpreadConfidenceBreakdown => {
	const priceScore = createPriceScore(
		[params.longPrice, params.shortPrice],
		params.snapshots,
	);
	const fundingScore = params.snapshots.every(
		(snapshot) => snapshot.fundingApr !== undefined,
	)
		? 1
		: 0;
	const feeScore = createFeeScore(params.snapshots);
	const freshnessScore = createFreshnessScore(
		params.snapshots,
		params.now,
		params.maxSnapshotAgeMs,
	);
	const liquidityScore = createLiquidityScore(params.snapshots);

	return {
		priceSource: createConfidenceComponent(
			priceScore,
			SPREAD_CONFIDENCE_WEIGHTS.priceSource,
			createPriceReason(
				[params.longPrice, params.shortPrice],
				params.snapshots,
			),
		),
		freshness: createConfidenceComponent(
			freshnessScore,
			SPREAD_CONFIDENCE_WEIGHTS.freshness,
			createFreshnessReason(params.snapshots, params.now, params.maxSnapshotAgeMs),
		),
		funding: createConfidenceComponent(
			fundingScore,
			SPREAD_CONFIDENCE_WEIGHTS.funding,
			fundingScore === 1 ? "Both sides have funding APR" : "Funding APR is missing on at least one side",
		),
		fees: createConfidenceComponent(
			feeScore,
			SPREAD_CONFIDENCE_WEIGHTS.fees,
			createFeeReason(params.snapshots),
		),
		liquidity: createConfidenceComponent(
			liquidityScore,
			SPREAD_CONFIDENCE_WEIGHTS.liquidity,
			createLiquidityReason(params.snapshots),
		),
	};
};

/** Scores price quality from source type and BBO spread width. */
const createPriceScore = (
	prices: Pick<SpreadPrice, "source">[],
	snapshots: MarketSnapshot[],
): number =>
	average(prices.map((price, index) =>
		SPREAD_CONFIDENCE_PRICE_SOURCE_SCORE[price.source] *
		(price.source === "bbo" ? createBboQualityScore(snapshots[index]) : 1),
	));

const createPriceReason = (
	prices: Pick<SpreadPrice, "source">[],
	snapshots: MarketSnapshot[],
): string => {
	const sourceReason = prices.map((price) => price.source).join("/");
	const bboSpreads = prices
		.map((price, index) =>
			price.source === "bbo"
				? formatBboSpreadPercent(getBboMetrics(snapshots[index]).spreadPercent)
				: undefined,
		)
		.filter((value): value is string => value !== undefined);

	return bboSpreads.length
		? `${sourceReason}, BBO spreads ${bboSpreads.join(" / ")}`
		: sourceReason;
};

/** Penalizes wide or missing bid/ask spreads for BBO-derived prices. */
const createBboQualityScore = (snapshot: MarketSnapshot): number => {
	const spreadPercent = getBboMetrics(snapshot).spreadPercent;

	if (spreadPercent === undefined) {
		return 0;
	}

	if (spreadPercent <= SPREAD_CONFIDENCE_BBO_SPREAD.GOOD_PERCENT) {
		return 1;
	}

	if (spreadPercent >= SPREAD_CONFIDENCE_BBO_SPREAD.MAX_PERCENT) {
		return 0;
	}

	return 1 -
		(spreadPercent - SPREAD_CONFIDENCE_BBO_SPREAD.GOOD_PERCENT) /
			(SPREAD_CONFIDENCE_BBO_SPREAD.MAX_PERCENT -
				SPREAD_CONFIDENCE_BBO_SPREAD.GOOD_PERCENT);
};

/** Checks that bid and ask are present, positive, and not crossed. */
const hasValidBbo = (snapshot: MarketSnapshot): snapshot is MarketSnapshot & {
	bidPrice: number;
	askPrice: number;
} => getBboMetrics(snapshot).isValid;

/** Returns BBO validity and internal spread percentage for one snapshot. */
const getBboMetrics = (snapshot: MarketSnapshot): BboMetrics => {
	if (
		snapshot.bidPrice === undefined ||
		snapshot.askPrice === undefined ||
		snapshot.bidPrice <= 0 ||
		snapshot.askPrice <= 0 ||
		snapshot.bidPrice > snapshot.askPrice
	) {
		return { isValid: false };
	}

	const midPrice = (snapshot.bidPrice + snapshot.askPrice) / 2;

	return {
		isValid: true,
		spreadPercent: (snapshot.askPrice - snapshot.bidPrice) / midPrice,
	};
};

const formatBboSpreadPercent = (spreadPercent?: number): string =>
	spreadPercent === undefined ? "missing" : `${(spreadPercent * 100).toFixed(3)}%`;

const createSpreadConfidence = (
	breakdown: SpreadConfidenceBreakdown,
): number => {
	return clampConfidence(
		Object.values(breakdown).reduce(
			(sum, component) => sum + component.weightedScore,
			0,
		),
	);
};

/** Creates one normalized weighted confidence component. */
const createConfidenceComponent = (
	score: number,
	weight: number,
	reason: string,
): {
	score: number;
	weight: number;
	weightedScore: number;
	reason: string;
} => ({
	score,
	weight,
	weightedScore: score * weight,
	reason,
});

/** Scores price freshness relative to the user-selected maximum snapshot age. */
const createFreshnessScore = (
	snapshots: MarketSnapshot[],
	now: number,
	maxSnapshotAgeMs: number,
): number => {
	const scores = snapshots.map((snapshot) => {
		const freshnessTimestamp = getPriceFreshnessTimestamp(snapshot);

		if (freshnessTimestamp === undefined) {
			return 0;
		}

		const ageMs = Math.max(0, now - freshnessTimestamp);

		if (ageMs > maxSnapshotAgeMs) {
			return 0;
		}

		return 1 - ageMs / maxSnapshotAgeMs;
	});

	return average(scores);
};

/** Scores liquidity from depth, BBO sizes, open interest, and 24h volume. */
const createLiquidityScore = (snapshots: MarketSnapshot[]): number => {
	const scores = snapshots.map((snapshot) => {
		const hasDepth = hasOrderBookDepth(snapshot);
		const hasBboSize = hasTopOfBookSize(snapshot);
		const hasOpenInterest = snapshot.openInterest !== undefined;
		const hasVolume = snapshot.volume24h !== undefined;

		return Math.min(
			1,
			(hasDepth ? 0.5 : hasBboSize ? 0.35 : 0) +
				(hasOpenInterest ? 0.25 : 0) +
				(hasVolume ? 0.25 : 0),
		);
	});

	return average(scores);
};

const createFeeScore = (snapshots: MarketSnapshot[]): number => {
	if (snapshots.some((snapshot) => snapshot.takerFeeRate === undefined)) {
		return 0;
	}

	return snapshots.every((snapshot) => snapshot.feeSource === "api") ? 1 : 0.6;
};

const createFeeReason = (snapshots: MarketSnapshot[]): string => {
	if (snapshots.some((snapshot) => snapshot.takerFeeRate === undefined)) {
		return "Taker fee is missing on at least one side";
	}

	const sources = snapshots.map((snapshot) => snapshot.feeSource ?? "unknown");

	return sources.every((source) => source === "api")
		? "Both sides have API taker fees"
		: `Fee sources ${sources.join(" / ")}`;
};

const createFreshnessReason = (
	snapshots: MarketSnapshot[],
	now: number,
	maxSnapshotAgeMs: number,
): string => {
	const ages = snapshots.map((snapshot) => {
		const freshnessTimestamp = getPriceFreshnessTimestamp(snapshot);

		return freshnessTimestamp === undefined
			? "missing"
			: `${Math.max(0, now - freshnessTimestamp)}ms`;
	});

	return `Ages ${ages.join(" / ")}, max ${maxSnapshotAgeMs}ms`;
};

const createLiquidityReason = (snapshots: MarketSnapshot[]): string => {
	const sides = snapshots.map((snapshot) => {
		const parts = [
			createDepthReason(snapshot),
			!hasOrderBookDepth(snapshot) && hasTopOfBookSize(snapshot)
				? "BBO size"
				: undefined,
			snapshot.openInterest !== undefined ? "OI" : undefined,
			snapshot.volume24h !== undefined ? "24h volume" : undefined,
		].filter(Boolean);

		return parts.length ? parts.join("+") : "missing";
	});

	return sides.join(" / ");
};

const hasOrderBookDepth = (snapshot: MarketSnapshot): boolean =>
	(snapshot.orderBookBids?.length ?? 0) > 0 &&
	(snapshot.orderBookAsks?.length ?? 0) > 0;

const hasTopOfBookSize = (snapshot: MarketSnapshot): boolean =>
	snapshot.bidSize !== undefined &&
	snapshot.askSize !== undefined &&
	snapshot.bidSize > 0 &&
	snapshot.askSize > 0;

const createDepthReason = (snapshot: MarketSnapshot): string | undefined =>
	hasOrderBookDepth(snapshot)
		? `depth ${snapshot.orderBookBids?.length ?? 0}x${snapshot.orderBookAsks?.length ?? 0}`
		: undefined;

const isSpreadStale = (
	snapshots: MarketSnapshot[],
	now: number,
	maxSnapshotAgeMs: number,
): boolean =>
	snapshots.some(
		(snapshot) =>
			getPriceFreshnessTimestamp(snapshot) === undefined ||
			now - (getPriceFreshnessTimestamp(snapshot) ?? 0) > maxSnapshotAgeMs,
	);

const clampConfidence = (value: number): number =>
	Math.min(
		SPREAD_CONFIDENCE_MAX_SCORE,
		Math.max(SPREAD_CONFIDENCE_MIN_SCORE, value),
	);

const getPriceFreshnessTimestamp = (snapshot: MarketSnapshot): number | undefined =>
	snapshot.priceReceivedAt ?? snapshot.receivedAt ?? snapshot.timestamp;

const getFundingFreshnessTimestamp = (snapshot: MarketSnapshot): number | undefined =>
	snapshot.fundingReceivedAt ?? snapshot.receivedAt ?? snapshot.timestamp;

const getLiquidityFreshnessTimestamp = (snapshot: MarketSnapshot): number | undefined =>
	snapshot.liquidityReceivedAt ?? snapshot.receivedAt ?? snapshot.timestamp;

const average = (values: number[]): number =>
	values.reduce((sum, value) => sum + value, 0) / values.length;
