export type AssetPrice = {
	symbol: string;
	priceUsd: number;
	source: string;
	updatedAt: string;
};

export type AssetPriceError = {
	symbol: string;
	code: string;
	message: string;
};

export type AssetPricesQuery = {
	symbols: string[];
};

export type AssetPricesResponse = AssetPricesQuery & {
	prices: AssetPrice[];
	errors: AssetPriceError[];
};

export type BinanceTickerPriceResponse = {
	symbol: string;
	price: string;
};
