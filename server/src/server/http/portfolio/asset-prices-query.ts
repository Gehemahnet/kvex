import { normalizeAssetPriceSymbol } from "#services/portfolio/asset-prices/asset-prices.utils";
import type { AssetPricesQuery } from "#services/portfolio/asset-prices/asset-prices.types";
import { BadRequestError } from "../http-errors";

/** Parses and validates `/portfolio/prices` query parameters. */
export const parseAssetPricesQuery = (
	urlString: string | undefined,
): AssetPricesQuery => {
	const url = new URL(urlString ?? "/", "http://localhost");
	const value = url.searchParams.get("symbols")?.trim();

	if (!value) {
		throw new BadRequestError(
			"Query param `symbols` is required",
			"MISSING_ASSET_PRICE_SYMBOLS",
		);
	}

	try {
		const symbols = [
			...new Set(
				value
					.split(",")
					.map((symbol) => normalizeAssetPriceSymbol(symbol))
					.filter(Boolean),
			),
		];

		if (symbols.length === 0) {
			throw new Error("No symbols");
		}

		return { symbols };
	} catch {
		throw new BadRequestError(
			"Query param `symbols` must contain comma-separated asset symbols",
			"INVALID_ASSET_PRICE_SYMBOLS",
		);
	}
};
