/**
 * @hasNext Whether there are more objects to paginate through
 * @nextCursor Pointer to the next page in pagination dataset
 * @data Array of data objects
 * */
export interface EtherealPaginatingResponse<T> {
	hasNext: boolean;
	nextCursor?: string;
	data: T[];
}

export interface EtherealErrorResponse {
	statusCode: number;
	message: string;
	error: string;
}

/**
 * @order Direction to paginate through objects (asc | desc)
 * @limit Limit the number of objects to return
 * @cursor Pointer to the current object in pagination dataset
 * @orderBy Order by field (createdAt | openInterest | baseTokenName | quoteTokenName)
 * @ticker Filter products by ticker (alphanumeric, case insensitive)
 */
export interface GetProductsQueryParams {
	order?: "asc" | "desc";
	limit?: number;
	cursor?: string;
	orderBy?: "createdAt" | "openInterest" | "baseTokenName" | "quoteTokenName";
	ticker?: string;
}

export type ProductStatus = "PENDING" | "ACTIVE";

export type EngineType = 0 | 1;

/**
 * @id Id representing the registered product
 * @ticker Product ticker based on the base quote token
 * @displayTicker Product display ticker based on the base quote token
 * @baseTokenAddress Address of the base token (non-checksummed; zero address if virtual)
 * @quoteTokenAddress Address of quote token (non-checksummed)
 * @baseTokenName Name of the base token (e.g. BTC in BTCUSD)
 * @quoteTokenName Name of the quote token (e.g. USD in BTCUSD)
 * @engineType The corresponding engine type this product was registered with
 * @onchainId The productId generated onchain after registering for the first time
 * @status Product status
 * @blockNumber Block number this product was registered on
 * @cumulativeFundingUsd Cumulative funding in USD of the product (precision: 9)
 * @createdAt Product creation timestamp (ms since Unix Epoch)
 * @fundingUpdatedAt Unix timestamp when funding was last updated
 * @minQuantity The minimum order quantity in native units expressed as a decimal (precision: 9)
 * @lotSize Quantity must be divisible by the lotSize (precision: 9)
 * @tickSize Minimum price increment (precision: 9)
 * @makerFee Fee charged to the maker (precision: 9)
 * @takerFee Fee charged to the taker (precision: 9)
 * @maxQuantity Max quantity per order (precision: 9)
 * @minPrice Min price in USD (precision: 9)
 * @maxPrice Max price in USD (precision: 9)
 * @volume24h 24h volume in base token native units (precision: 9)
 * @maxLeverage Maximum leverage allowed
 * @pythFeedId Pyth price feed id
 * @fundingRate1h Last computed hourly funding rate (precision: 9)
 * @openInterest Open interest of both sides (precision: 9)
 * @maxOpenInterestUsd Max OI of one side in USD (precision: 9)
 * @maxPositionNotionalUsd Max position notional value in USD (precision: 9)
 * @fundingClampApr Funding clamp APR (precision: 9)
 * @fundingBaselineApr Funding baseline APR (precision: 9)
 * @fundingMaxApr Maximum funding APR (precision: 9)
 */
export interface ProductData {
	id: string;
	ticker: string;
	displayTicker: string;
	baseTokenAddress: string;
	quoteTokenAddress: string;
	baseTokenName: string;
	quoteTokenName: string;
	engineType: EngineType;
	onchainId: number;
	status: ProductStatus;
	blockNumber: string;
	cumulativeFundingUsd: string;
	createdAt: number;
	fundingUpdatedAt?: number;
	minQuantity: string;
	lotSize: string;
	tickSize: string;
	makerFee: string;
	takerFee: string;
	maxQuantity: string;
	minPrice: string;
	maxPrice: string;
	volume24h: string;
	maxLeverage: number;
	pythFeedId: number;
	fundingRate1h: string;
	openInterest: string;
	maxOpenInterestUsd: string;
	maxPositionNotionalUsd: string;
	fundingClampApr: string;
	fundingBaselineApr: string;
	fundingMaxApr: string;
}

export type GetProductResponse = EtherealPaginatingResponse<ProductData>;

export type EtherealFundingRange = "DAY" | "WEEK" | "MONTH";

/**
 * @order  Direction to paginate through objects
 * @limit Limit the number of objects to return
 * @cursor Pointer to the current object in pagination dataset
 * @productId Id representing the registered product
 * @range The range of time of funding rates to retrieve
 * @orderBy Order by field
 */
export interface GetFundingQueryParams {
	order?: "asc" | "desc";
	limit?: number;
	cursor?: string;
	productId: string;
	range: EtherealFundingRange;
	orderBy?: "createdAt";
}

/**
 * @createdAt Funding charge timestamp (ms since Unix Epoch)
 * @fundingRate1h Hourly funding rate
 * */
export interface FundingData {
	createdAt: number;
	fundingRate1h: string;
}

export type GetFundingResponse = EtherealPaginatingResponse<FundingData>;
