// ============================================
// GET /api/v1/info - Получение информации о рынке
// ============================================

export interface GetMarketInfoResponse {
    success: boolean;
    data: MarketInfo[];
    error: null;
    code: null;
}

export interface MarketInfo {
    /** Trading pair symbol */
    symbol: string;
    /** Tick size. All prices are denominated as a multiple of this */
    tick_size: string;
    /** Minimum tick. API submitted price cannot be below this value */
    min_tick: string;
    /** Maximum tick. API submitted price cannot be above this value */
    max_tick: string;
    /** Lot size. All order sizes (token denominated) are denominated as a multiple of this */
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
    /** Estimated funding rate to be paid in the next funding epoch (hour) */
    next_funding_rate: string;
    /** Timestamp when the market was listed on Pacifica. Markets are returned oldest first */
    created_at: number;
}

// ============================================
// GET /api/v1/kline/mark - Получение свечей mark price
// ============================================

export interface GetMarkPriceCandleResponse {
    success: boolean;
    data: MarkPriceCandle[];
    error: null;
    code: null;
}

export interface MarkPriceCandle {
    /** Candle start time */
    t: number;
    /** Candle end time */
    T: number;
    /** Symbol */
    s: string;
    /** Time interval of candles */
    i: string;
    /** Open price */
    o: string;
    /** Close price */
    c: string;
    /** High price */
    h: string;
    /** Low price */
    l: string;
    /** Volume (always "0") */
    v: string;
    /** Number of trades on Pacifica in candle duration */
    n: number;
}

// ============================================
// GET /api/v1/kline - Получение свечей
// ============================================

export interface GetCandleParams {
    symbol: string;
    interval: string;
    start_time: number;
    end_time?: number;
}

export interface GetCandleResponse {
    success: boolean;
    data: Candle[];
    error: null;
    code: null;
}

export interface Candle {
    /** Candle start time */
    t: number;
    /** Candle end time */
    T: number;
    /** Symbol */
    s: string;
    /** Time interval of candles */
    i: string;
    /** Open price */
    o: string;
    /** Close price */
    c: string;
    /** High price */
    h: string;
    /** Low price */
    l: string;
    /** Volume */
    v: string;
    /** Number of trades on Pacifica for specified symbol */
    n: number;
}

// ============================================
// GET /api/v1/info/prices - Получение цен
// ============================================

export interface GetPricesResponse {
    success: boolean;
    data: PriceInfo[];
    error: null;
    code: null;
}

export interface PriceInfo {
    /** Funding rate paid in the past funding epoch (hour) */
    funding: string;
    /** Mark price */
    mark: string;
    /** Mid price, defined as the average of the best bid and best ask price */
    mid: string;
    /** Estimated funding rate to be paid in the next funding epoch (hour) */
    next_funding: string;
    /** The current open interest on this symbol (in USD) */
    open_interest: string;
    /** Oracle price */
    oracle: string;
    /** Trading pair symbol */
    symbol: string;
    /** Timestamp in Milliseconds */
    timestamp: number;
    /** Volume (USD) of this market in the past 24 hours */
    volume_24h: string;
    /** Oracle price of this market 24 hours ago (USD) */
    yesterday_price: string;
}

// ============================================
// GET /api/v1/book - Получение стакана заказов
// ============================================

export interface OrderbookParams {
    symbol: string;
    agg_level?: number;
}

export interface OrderbookResponse {
    success: boolean;
    data: Orderbook;
    error: null;
    code: null;
}

export interface Orderbook {
    /** Symbol */
    s: string;
    /** Two-dimensional array containing bids (index 0) and asks (index 1). Each index contains up to 10 levels. */
    l: [OrderbookLevel[], OrderbookLevel[]];
    /** Response timestamp in milliseconds */
    t: number;
}

export interface OrderbookLevel {
    /** Price level */
    p: string;
    /** Total amount at price level */
    a: string;
    /** Number of orders at level */
    n: number;
}

// ============================================
// GET /api/v1/trades - Получение последних сделок
// ============================================

export interface GetRecentTradesParams {
    symbol: string;
}

export interface TradesResponse {
    success: boolean;
    data: Trade[];
    error: null;
    code: null;
    last_order_id: number;
}

export interface Trade {
    /** "fulfill_taker" if maker, "fulfill_maker" if taker */
    event_type: 'fulfill_taker' | 'fulfill_maker';
    /** Price in USD at which trade event has occurred */
    price: string;
    /** Amount in token denomination for which the trade has occurred for */
    amount: string;
    /** Trade side */
    side: 'open_long' | 'open_short' | 'close_long' | 'close_short';
    /** Cause of the trade */
    cause: 'normal' | 'market_liquidation' | 'backstop_liquidation' | 'settlement';
    /** Timestamp in milliseconds of trade event */
    created_at: number;
}

// ============================================
// GET /api/v1/funding_rate/history - Исторические данные по funding rate
// ============================================

export interface GetFundingHistoryParams {
    symbol: string;
    limit?: number;
    cursor?: string;
}

export interface GetFundingRateHistoryResponse {
    success: boolean;
    data: FundingRate[];
    next_cursor: string;
    has_more: boolean;
}

export interface FundingRate {
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
}