export type NadoSymbol = {
	type: "spot" | "perp";
	product_id: number;
	symbol: string;
	maker_fee_rate_x18: string;
	taker_fee_rate_x18: string;
	trading_status: string;
};

export type NadoFundingRate = {
	product_id: number;
	funding_rate_x18: string;
	update_time: string;
};

export type NadoFundingRatesResponse = Record<string, NadoFundingRate>;

export type NadoPerpPrice = {
	product_id: number;
	index_price_x18: string;
	mark_price_x18: string;
	update_time: string;
};

export type NadoPerpPricesResponse = Record<string, NadoPerpPrice>;

export type NadoMarketLiquidityLevel = [priceX18: string, sizeX18: string];

export type NadoMarketLiquidity = {
	bids: NadoMarketLiquidityLevel[];
	asks: NadoMarketLiquidityLevel[];
	product_id: number;
	timestamp: string;
};

export type NadoMarketLiquidityResponse = {
	status: "success" | "failure";
	data?: NadoMarketLiquidity;
	error?: string;
	error_code?: number;
	request_type: string;
};

export type NadoSubaccountBalance = {
	amount: string;
	oraclePrice?: string;
	productId: number;
	symbol?: string;
	type: "perp" | "spot";
	valueUsd?: number;
	vQuoteBalance?: string;
};

export type NadoSubaccountSummary = {
	balances: NadoSubaccountBalance[];
	exists: boolean;
};
