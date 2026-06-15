import { getCachedValue } from "#common/cache.utils";
import { FetchHttpClient, type HttpClient } from "#common/http-client";
import { log } from "#common/logger";
import {
	ASSET_PRICE_CACHE_TTL_MS,
	BINANCE_TICKER_PRICE_URL,
	PRICE_SYMBOL_ALIASES,
	SUPPORTED_ASSET_PRICE_SYMBOLS,
	USD_STABLECOIN_SYMBOLS,
} from "#services/portfolio/asset-prices/asset-prices.constants";
import type {
	AssetPrice,
	AssetPriceError,
	AssetPricesQuery,
	AssetPricesResponse,
	BinanceTickerPriceResponse,
} from "./asset-prices.types";
import {
	createUsdtPairSymbol,
	normalizeAssetPriceSymbol,
} from "./asset-prices.utils";

/** Returns best-effort USD prices for portfolio asset symbols. */
export const getAssetPrices = async (
	query: AssetPricesQuery,
	dependencies: {
		httpClient?: HttpClient;
		now?: () => Date;
	} = {},
): Promise<AssetPricesResponse> => {
	const startedAt = performance.now();
	const httpClient = dependencies.httpClient ?? new FetchHttpClient();
	const now = dependencies.now ?? (() => new Date());
	const requestedSymbols = [...new Set(query.symbols.map(normalizeAssetPriceSymbol))];
	const symbols = requestedSymbols.filter((symbol) =>
		SUPPORTED_ASSET_PRICE_SYMBOLS.has(symbol),
	);
	const results = await Promise.all(
		symbols.map((symbol) => getAssetPriceResult(symbol, httpClient, now)),
	);
	const prices = results.flatMap((result) => result.price ? [result.price] : []);
	const errors = results.flatMap((result) => result.error ? [result.error] : []);

	log("info", "asset_prices_completed", {
		durationMs: roundDurationMs(performance.now() - startedAt),
		errorsCount: errors.length,
		skippedSymbolsCount: requestedSymbols.length - symbols.length,
		pricesCount: prices.length,
		symbolsCount: symbols.length,
	});

	return {
		symbols,
		prices,
		errors,
	};
};

const getAssetPriceResult = async (
	symbol: string,
	httpClient: HttpClient,
	now: () => Date,
): Promise<{
	error?: AssetPriceError;
	price?: AssetPrice;
}> => {
	try {
		return {
			price: await getAssetPrice(symbol, httpClient, now),
		};
	} catch (error) {
		return {
			error: {
				symbol,
				code: "PRICE_FETCH_FAILED",
				message: error instanceof Error ? error.message : "Unable to fetch price",
			},
		};
	}
};

const getAssetPrice = async (
	symbol: string,
	httpClient: HttpClient,
	now: () => Date,
): Promise<AssetPrice> => {
	if (USD_STABLECOIN_SYMBOLS.has(symbol)) {
		return {
			symbol,
			priceUsd: 1,
			source: "stablecoin",
			updatedAt: now().toISOString(),
		};
	}

	const providerSymbol = PRICE_SYMBOL_ALIASES[symbol] ?? symbol;
	const tickerSymbol = createUsdtPairSymbol(providerSymbol);
	const url = `${BINANCE_TICKER_PRICE_URL}?symbol=${encodeURIComponent(tickerSymbol)}`;
	const priceUsd = await getCachedValue(
		createAssetPriceCacheKey(symbol),
		ASSET_PRICE_CACHE_TTL_MS,
		async () => {
			const ticker = await httpClient.get<BinanceTickerPriceResponse>(url);

			return Number.parseFloat(ticker.price);
		},
	);

	if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
		throw new Error(`Invalid price for ${symbol}`);
	}

	return {
		symbol,
		priceUsd,
		source: "binance",
		updatedAt: now().toISOString(),
	};
};

const createAssetPriceCacheKey = (symbol: string): string =>
	`portfolio:asset-price:${symbol}`;

const roundDurationMs = (durationMs: number): number =>
	Math.round(durationMs * 100) / 100;
