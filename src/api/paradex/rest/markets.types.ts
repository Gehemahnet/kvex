// ============================================
// GET /api/v1/bbo/{market} - Get market bbo
// ============================================

export interface GetBBOParams {
	market: string;
}

export interface BBOResponse {
	/** Ask price */
	ask: string;
	/** Ask size */
	ask_size: string;
	/** Bid price */
	bid: string;
	/** Bid size */
	bid_size: string;
	/** Last updated timestamp */
	last_updated_at: number;
	/** Market symbol */
	market: string;
	/** Sequence number */
	seq_no: number;
}

// ============================================
// GET /api/v1/funding/data - Funding data history
// ============================================

export interface GetFundingDataParams {
	/** Market for which funding payments are queried */
	market: string;
	/** Returns the 'next' paginated page */
	cursor?: string;
	/** End Time (unix time millisecond) */
	end_at?: number;
	/** Limit the number of responses in the page */
	page_size?: number;
	/** Start Time (unix time millisecond) */
	start_at?: number;
}

export interface FundingDataResponse {
	/** Pagination information */
	next: string;
	/** Pagination information */
	prev: string;
	/** Array of funding data results */
	results: FundingDataResult[];
}

export interface FundingDataResult {
	/** Created timestamp */
	created_at: number;
	/** Funding index */
	funding_index: string;
	/** Funding period in hours */
	funding_period_hours: number;
	/** Funding premium */
	funding_premium: string;
	/** Funding rate */
	funding_rate: string;
	/** 8-hour funding rate */
	funding_rate_8h: string;
	/** Market symbol */
	market: string;
}

// ============================================
// GET /api/v1/markets - List available markets
// ============================================

export interface GetMarketsParams {
	/** Market Name - example: BTC-USD-PERP */
	market?: string;
}

export interface GetMarketsResponse {
	results: GetMarketsItem[];
}

export interface GetMarketsItem {
	/** Asset kind (PERP, PERP_OPTION) */
	asset_kind: "PERP" | "PERP_OPTION";
	/** Base currency */
	base_currency: string;
	/** Chain details */
	chain_details: MarketChainDetails;
	/** Clamp rate */
	clamp_rate: string;
	/** Delta1 cross margin parameters */
	delta1_cross_margin_params: Delta1CrossMarginParams;
	/** Expiry timestamp */
	expiry_at: number;
	/** Fee configuration */
	fee_config: MarketFeeConfig;
	/** Funding multiplier */
	funding_multiplier: number;
	/** Funding period in hours */
	funding_period_hours: number;
	/** Interest rate */
	interest_rate: string;
	/** IV bands width */
	iv_bands_width: string;
	/** Market kind */
	market_kind: "" | "cross" | "isolated" | "isolated_margin";
	/** Maximum funding rate */
	max_funding_rate: string;
	/** Maximum funding rate change */
	max_funding_rate_change: string;
	/** Maximum open orders */
	max_open_orders: number;
	/** Maximum order size */
	max_order_size: string;
	/** Maximum slippage */
	max_slippage: string;
	/** Maximum TOB spread */
	max_tob_spread: string;
	/** Minimum notional */
	min_notional: string;
	/** Open timestamp */
	open_at: number;
	/** Option cross margin parameters */
	option_cross_margin_params: OptionCrossMarginParams;
	/** Option type (PUT, CALL) */
	option_type?: "PUT" | "CALL";
	/** Oracle EWMA factor */
	oracle_ewma_factor: string;
	/** Order size increment */
	order_size_increment: string;
	/** Position limit */
	position_limit: string;
	/** Price bands width */
	price_bands_width: string;
	/** Price feed ID */
	price_feed_id: string;
	/** Price tick size */
	price_tick_size: string;
	/** Quote currency */
	quote_currency: string;
	/** Settlement currency */
	settlement_currency: string;
	/** Strike price (for options) */
	strike_price?: string;
	/** Symbol */
	symbol: string;
	/** Tags */
	tags: string[];
}

export interface MarketChainDetails {
	/** Collateral address */
	collateral_address: string;
	/** Contract address */
	contract_address: string;
	/** Fee account address */
	fee_account_address: string;
	/** Maker fee */
	fee_maker: string;
	/** Taker fee */
	fee_taker: string;
	/** Insurance fund address */
	insurance_fund_address: string;
	/** Liquidation fee */
	liquidation_fee: string;
	/** Oracle address */
	oracle_address: string;
	/** Symbol */
	symbol: string;
}

export interface Delta1CrossMarginParams {
	/** IMF base */
	imf_base: string;
	/** IMF factor */
	imf_factor: string;
	/** IMF shift */
	imf_shift: string;
	/** MMF factor */
	mmf_factor: string;
}

export interface FeeWithCap {
	/** Fee */
	fee: string;
	/** Fee cap */
	fee_cap: string;
	/** Fee floor */
	fee_floor: string;
}

export interface MakerTakerFee {
	/** Maker fee configuration */
	maker_fee: FeeWithCap;
	/** Taker fee configuration */
	taker_fee: FeeWithCap;
}

export interface MarketFeeConfig {
	/** API fee configuration */
	api_fee: MakerTakerFee;
	/** Interactive fee configuration */
	interactive_fee: MakerTakerFee;
	/** RPI fee configuration */
	rpi_fee: MakerTakerFee;
}

export interface OptionMarginParams {
	/** Long ITM */
	long_itm: string;
	/** Premium multiplier */
	premium_multiplier: string;
	/** Short ITM */
	short_itm: string;
	/** Short OTM */
	short_otm: string;
	/** Short put cap */
	short_put_cap: string;
}

export interface OptionCrossMarginParams {
	/** IMF parameters */
	imf: OptionMarginParams;
	/** MMF parameters */
	mmf: OptionMarginParams;
}

// ============================================
// GET /api/v1/markets/klines - OHLCV for a symbol
// ============================================

export interface GetKlinesParams {
	/** Symbol of the market pair */
	symbol: string;
	/** Resolution in minutes: 1, 3, 5, 15, 30, 60 */
	resolution: string;
	/** Start time for klines in milliseconds */
	start_at: number;
	/** End time for klines in milliseconds */
	end_at: number;
	/** Which price to use for the klines */
	price_kind?: "last" | "mark" | "underlying";
}

// Note: Response type for klines is not specified in the OpenAPI schema

// ============================================
// GET /api/v1/markets/summary - List available markets summary
// ============================================

export interface GetMarketsSummaryParams {
	/** Name of the market for which summary is requested (for all available markets use ALL) */
	market: string;
	/** End Time (unix time millisecond) */
	end?: number;
	/** Start Time (unix time millisecond) */
	start?: number;
}

export interface MarketsSummaryResponse {
	results: MarketSummaryResp[];
}

export interface MarketSummaryResp {
	/** Ask price */
	ask: string;
	/** Ask implied volatility */
	ask_iv: string;
	/** Bid price */
	bid: string;
	/** Bid implied volatility */
	bid_iv: string;
	/** Created timestamp */
	created_at: number;
	/** Delta */
	delta: string;
	/** Funding rate */
	funding_rate: string;
	/** Future funding rate */
	future_funding_rate: string;
	/** Greeks */
	greeks: Greeks;
	/** Last implied volatility */
	last_iv: string;
	/** Last traded price */
	last_traded_price: string;
	/** Mark implied volatility */
	mark_iv: string;
	/** Mark price */
	mark_price: string;
	/** Open interest */
	open_interest: string;
	/** 24-hour price change rate */
	price_change_rate_24h: string;
	/** Symbol */
	symbol: string;
	/** Total volume */
	total_volume: string;
	/** Underlying price */
	underlying_price: string;
	/** 24-hour volume */
	volume_24h: string;
}

export interface Greeks {
	/** Delta */
	delta: string;
	/** Gamma */
	gamma: string;
	/** Rho */
	rho: string;
	/** Vanna */
	vanna: string;
	/** Vega */
	vega: string;
	/** Volga */
	volga: string;
}

// ============================================
// GET /api/v1/orderbook/{market} - Get market orderbook
// GET /api/v1/orderbook/{market}/interactive - Get market interactive orderbook
// ============================================

export interface GetOrderbookParams {
	/** Market symbol - ex: BTC-USD-PERP */
	market: string;
	/** Depth */
	depth?: number;
	/** Price tick for aggregation */
	price_tick?: string;
}

export interface GetOrderbookInteractiveParams {
	/** Market symbol - ex: BTC-USD-PERP */
	market: string;
	/** Depth */
	depth?: number;
	/** Price tick for aggregation */
	price_tick?: string;
}

export interface AskBidArrayResponse {
	/** Ask levels array [price, size] */
	asks: string[][];
	/** Best ask price and size for API orders */
	best_ask_api: string[];
	/** Best ask price and size for interactive orders */
	best_ask_interactive: string[];
	/** Best bid price and size for API orders */
	best_bid_api: string[];
	/** Best bid price and size for interactive orders */
	best_bid_interactive: string[];
	/** Bid levels array [price, size] */
	bids: string[][];
	/** Last updated timestamp */
	last_updated_at: number;
	/** Market symbol */
	market: string;
	/** Sequence number */
	seq_no: number;
}

// ============================================
// GET /api/v1/orderbook/{market}/impact-price - Get market impact price
// ============================================

export interface GetImpactPriceParams {
	/** Market symbol - ex: BTC-USD-PERP */
	market: string;
	/** Size */
	size: number;
}

export interface ImpactPriceResponse {
	/** Impact price */
	impact_price: string;
	/** Market symbol */
	market: string;
	/** Side */
	side: string;
	/** Size */
	size: string;
}
