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
