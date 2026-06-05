import {
	AdapterPerpFullMetadata,
	GetPerpFullMetadataResponse,
} from "./hyperliquid.types";

/** Combines Hyperliquid universe metadata with the matching per-market runtime fields. */
export const getFullMarketsMetadataAdapter = (
	markets: GetPerpFullMetadataResponse,
): AdapterPerpFullMetadata => ({
	...markets[0],
	universe: markets[0].universe.map((marketShortInfo, marketIndex) => {
		const advancedMarketData = markets[1][marketIndex];

		return {
			...marketShortInfo,
			...advancedMarketData,
		};
	}),
});
