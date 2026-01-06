// ============================================
// GET /api/v1/account - Получение информации об аккаунте
// ============================================

export interface AccountInfoResponse {
    success: boolean;
    data: AccountInfo[];
    error: null | string;
    code: null | number;
}

export interface AccountInfo {
    /** Current account balance, defined as amount of USD in account before settlement */
    balance: string;
    /** Current fee tier of account, determined by trading volume */
    fee_level: number;
    /** Account balance + unrealized PnL */
    account_equity: string;
    /** Amount of account equity that is available to used to margin for open positions and orders */
    available_to_spend: string;
    /** Amount that is available to withdraw out from the exchange */
    available_to_withdraw: string;
    /** Amount of account balance in pending status (deposit request is successful, waiting on confirmation) */
    pending_balance: string;
    /** Amount of account equity currently being used to margin for open positions and orders */
    total_margin_used: string;
    /** The maintenance margin required under the cross mode */
    cross_mmr: string;
    /** Number of open positions (isolated and cross) */
    positions_count: number;
    /** Number of open orders across all markets (excludes stop orders) */
    orders_count: number;
    /** Number of open stop orders across markets */
    stop_orders_count: number;
    /** Timestamp in milliseconds of last account info update */
    updated_at: number;
    /** If the account uses last traded price to trigger stop orders */
    use_ltp_for_stop_orders: boolean;
}

// ============================================
// POST /api/v1/account/leverage - Обновление плеча
// ============================================

export interface UpdateLeverageRequest {
    /** User's wallet address */
    account: string;
    /** Trading pair symbol */
    symbol: string;
    /** New leverage value */
    leverage: number;
    /** Current timestamp in milliseconds */
    timestamp: number;
    /** Signature expiry in milliseconds */
    expiry_window?: number;
    /** Agent wallet address */
    agent_wallet?: string;
    /** Cryptographic signature */
    signature: string;
}

export interface UpdateLeverageResponse {
    success: boolean;
}

export interface UpdateLeverageErrorResponse {
    error: string;
    code: number;
}

// ============================================
// GET /api/v1/positions - Получение позиций
// ============================================

export interface PositionsResponse {
    success: boolean;
    data: Position[];
    error: null | string;
    code: null | number;
    /** Exchange-wide nonce. Used to reliably determine exchange event ordering. Sequential and not subject to clock drift. */
    last_order_id: number;
}

export interface Position {
    /** Trading pair symbol */
    symbol: string;
    /** Whether the position is long/short */
    side: 'ask' | 'bid' | string;
    /** Position amount */
    amount: string;
    /** Entry price of the position. Takes VWAP if position was opened by multiple trades executed at different prices. */
    entry_price: string;
    /** Amount of margin allocated to an isolated position (only shown when isolated) */
    margin: string;
    /** Funding paid by this position since open */
    funding: string;
    /** If the position is opened in isolated margin mode */
    isolated: boolean;
    /** Timestamp in milliseconds when these settings were adjusted from their default */
    created_at: number;
    /** Timestamp in milliseconds when these settings were last updated */
    updated_at: number;
}