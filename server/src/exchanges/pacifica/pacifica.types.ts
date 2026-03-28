export interface MarketData {
	/** Trading pair symbol */
	symbol: string;
	/** Tick size. All prices are denominated as a multiple of this. */
	tick_size: string;
	/** Minimum tick. API submitted price cannot be below this value */
	min_tick: string;
	/** Maximum tick. API submitted price cannot be above this value */
	max_tick: string;
	/** Lot size. All order sizes are denominated as a multiple of this */
	lot_size: string;
	/** Maximum leverage allowed on this symbol when opening positions */
	max_leverage: number;
	/** If the market is set to only allow isolated positions */
	isolated_only: boolean;
	/** Minimum order size (denominated in USD) */
	min_order_size: string;
	/** Maximum order size (denominated in USD) */
	max_order_size: string;
	/** Funding rate paid in the past funding epoch (hour) */
	funding_rate: string;
	/** Estimated funding rate for the next funding epoch (hour) */
	next_funding_rate: string;
	/** Timestamp when the market was listed (ISO 8601) */
	created_at: string;
}

export interface PriceData {
	/** Funding rate paid in the past funding epoch (hour) */
	funding: string;
	/** Mark price */
	mark: string;
	/** Mid price (average of best bid and ask) */
	mid: string;
	/** Estimated funding rate for the next funding epoch (hour) */
	next_funding: string;
	/** Current open interest on this symbol (USD) */
	open_interest: string;
	/** Oracle price */
	oracle: string;
	/** Trading pair symbol */
	symbol: string;
	/** Timestamp in milliseconds */
	timestamp: number;
	/** Volume (USD) in the past 24 hours */
	volume_24h: boolean;
	/** Oracle price 24 hours ago (USD) */
	yesterday_price: string;
}

export interface FundingRateHistory {
	/** Oracle price used for funding rate calculation */
	oracle_price: string;
	/** Bid impact price at time of calculation */
	bid_impact_price: string;
	/** Ask impact price at time of calculation */
	ask_impact_price: string;
	/** Last settled funding rate */
	funding_rate: string;
	/** Predicted funding rate for next settlement */
	next_funding_rate: string;
	/** Timestamp in milliseconds */
	created_at: number;
	/** Next cursor for pagination */
	next_cursor: string;
	/** True if there is a next page */
	has_more: boolean;
}

export interface PacificaResponse<Data> {
	data?: Data;
	success: boolean;
	error?: null | number;
	code?: null | string;
}

export interface PacificaPaginatingResponse<Data> {
	next_cursor: string;
	data?: Data;
	success: boolean;
	has_more: boolean;
}

export type GetMarketsResponse = PacificaResponse<MarketData[]>;
export type GetPricesResponse = PacificaResponse<PriceData[]>;
export type GetFundingRateHistoryResponse = PacificaPaginatingResponse<
	FundingRateHistory[]
>;

export type GetFundingRateHistoryParams = {
	/** Market symbol to query*/
	symbol: string;
	/** Number of records to show (default 100, max 4000)*/
	limit?: number;
	/** Cursor pagination to access records. Default to none*/
	cursor?: string;
};
