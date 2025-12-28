/* =========================
 * ENUMS
 * ========================= */

/**
 * Product lifecycle status
 */
export enum ProductStatus {
	/** Product is not yet tradable */
	PENDING = "PENDING",

	/** Product is active and tradable */
	ACTIVE = "ACTIVE",
}

/**
 * Trading engine type
 * 0 — perpetual futures
 * 1 — spot market
 */
export enum EngineType {
	PERP = 0,
	SPOT = 1,
}

/* =========================
 * BASE DTO
 * ========================= */

/**
 * Product (market) description
 */
export interface ProductDto {
	/** Product unique identifier (UUID) */
	id: string;

	/** Internal product ticker (e.g. ETH-USD-PERP) */
	ticker: string;

	/** Human-readable ticker */
	displayTicker: string;

	/** Base token smart contract address */
	baseTokenAddress: string;

	/** Quote token smart contract address */
	quoteTokenAddress: string;

	/** Base token name */
	baseTokenName: string;

	/** Quote token name */
	quoteTokenName: string;

	/** Trading engine type */
	engineType: EngineType;

	/** On-chain product identifier */
	onchainId: number;

	/** Current product status */
	status: ProductStatus;

	/** Block number when product was created or updated */
	blockNumber: string;

	/** Total accumulated funding paid in USD */
	cumulativeFundingUsd: string;

	/** Timestamp of the last funding update (unix ms) */
	fundingUpdatedAt?: number;

	/** Minimum order quantity */
	minQuantity: string;

	/** Lot size (step for quantity) */
	lotSize: string;

	/** Tick size (step for price) */
	tickSize: string;

	/** Maker trading fee */
	makerFee: string;

	/** Taker trading fee */
	takerFee: string;

	/** Maximum allowed order quantity */
	maxQuantity: string;

	/** Minimum allowed price */
	minPrice: string;

	/** Maximum allowed price */
	maxPrice: string;

	/** Trading volume over the last 24 hours (USD) */
	volume24h: string;

	/** Maximum allowed leverage */
	maxLeverage: number;

	/** Pyth oracle feed identifier */
	pythFeedId: number;

	/** Hourly funding rate */
	fundingRate1h: string;

	/** Current open interest */
	openInterest: string;

	/** Maximum open interest allowed in USD */
	maxOpenInterestUsd: string;

	/** Maximum position notional value in USD */
	maxPositionNotionalUsd: string;

	/** Product creation timestamp (unix ms) */
	createdAt: number;
}

/* =========================
 * PAGINATION
 * ========================= */

/**
 * Paginated list of products
 */
export interface PageOfProductDtos {
	/** List of products */
	data: ProductDto[];

	/** Indicates whether next page exists */
	hasNext: boolean;

	/** Cursor for the next page */
	nextCursor?: string;
}

/* =========================
 * MARKET DATA
 * ========================= */

/**
 * Market price snapshot for a product
 */
export interface MarketPriceDto {
	/** Product identifier */
	productId: string;

	/** Best bid price */
	bestBidPrice?: string;

	/** Best ask price */
	bestAskPrice?: string;

	/** Oracle price */
	oraclePrice?: string;

	/** Price 24 hours ago */
	price24hAgo?: string;
}

/**
 * List of market price snapshots
 */
export interface ListOfMarketPriceDtos {
	/** Market prices */
	data: MarketPriceDto[];
}

/**
 * Market liquidity snapshot
 */
export interface MarketLiquidityDto {
	/** Product identifier */
	productId: string;

	/** Bid-side liquidity in USD */
	bidLiquidityUsd: string;

	/** Ask-side liquidity in USD */
	askLiquidityUsd: string;
}

/* =========================
 * PARAMS DTO
 * ========================= */

/**
 * Query parameters for product list request
 */
export interface GetProductsQueryDto {
	/** Maximum number of products to return */
	limit?: number;

	/** Pagination cursor */
	cursor?: string;

	ticker?: string;

	orderBy?: "createdAt" | "openInterest" | "baseTokenName" | "quoteTokenName";
}

/**
 * Path parameters for product details request
 */
export interface GetProductByIdParamsDto {
	/** Product identifier */
	id: string;
}
