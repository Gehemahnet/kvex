// HL works with info endpoint configuring responses depend on body. More info https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint
export enum HyperliquidInfoRequestType {
	PerpDexs = "perpDexs",
	Meta = "meta",
	MetaAndAssetCtxs = "metaAndAssetCtxs",
	FundingHistory = "fundingHistory",
}

// Doesn't need to use it in params if you don't need data directly from HIP-3 dex.
export type PerpDexName =
	| "xyz"
	| "flx"
	| "vntl"
	| "hyna"
	| "km"
	| "abcd"
	| "cash";

export interface GetPerpMetadataRequestBody {
	type: HyperliquidInfoRequestType;
	dex?: PerpDexName;
}

export interface MetaUniverse {
	/** Minimum decimal places for order sizes. */
	szDecimals: number;
	/** Name of the universe. */
	name: string;
	/** Maximum allowed leverage. */
	maxLeverage: number;
	/** Unique identifier for the margin requirements table. */
	marginTableId: number;
	/** Indicates if only isolated margin trading is allowed. */
	onlyIsolated?: true;
	/** Indicates if the universe is delisted. */
	isDelisted?: true;
	/** Trading margin mode constraint. */
	marginMode?: "strictIsolated" | "noCross";
	/** Indicates if growth mode is enabled. */
	growthMode?: "enabled";
	/** Timestamp of the last growth mode change. */
	lastGrowthModeChangeTime?: string;
}

export interface MarginTable {
	/** Description of the margin table. */
	description: string;
	/** Array of margin tiers defining leverage limits. */
	marginTiers: {
		/**Lower position size boundary for this tier.*/
		lowerBound: string;
		/** Maximum allowed leverage for this tier. */
		maxLeverage: number;
	}[];
}

export interface PerpAssetCtxSchema {
	/**Previous day's closing price.*/
	prevDayPx: string;
	/**Daily notional volume.*/
	dayNtlVlm: string;
	/**Mark price.*/
	markPx: string;
	/**Mid price.*/
	midPx: string | null;
	/**Funding rate.*/
	funding: string;
	/**Total open interest.*/
	openInterest: string;
	/**Premium price.*/
	premium: string | null;
	/**Oracle price.*/
	oraclePx: string;
	/**Array of impact prices.*/
	impactPxs: string[] | null;
	/**Daily volume in base currency.*/
	dayBaseVlm: string;
}

export type GetPerpMetadataResponse = {
	universe: MetaUniverse[];
	marginTables: MarginTable[];
	collateralToken?: number;
};

export type GetPerpFullMetadataResponse = [
	GetPerpMetadataResponse,
	PerpAssetCtxSchema[],
];

export type AdapterPerpFullMetadata = {
	universe: (MetaUniverse & PerpAssetCtxSchema)[];
	marginTables: MarginTable[];
	collateralToken?: number;
};

export interface HistoricalFundingRequestBody {
	type: HyperliquidInfoRequestType;
	coin: string;
	startTime: number;
	endTime?: number;
}

export interface HistoricalFunding {
	/** Asset symbol. */
	coin: string;
	/**Funding rate.*/
	fundingRate: string;
	/**Premium price.*/
	premium: string;
	/** Funding record timestamp (ms since epoch). */
	time: number;
}
