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
		/**
		 * Lower position size boundary for this tier.
		 * @pattern ^[0-9]+(\.[0-9]+)?$
		 */
		lowerBound: string;
		/** Maximum allowed leverage for this tier. */
		maxLeverage: number;
	}[];
}

export interface PerpAssetCtxSchema {
	/**
	 * Previous day's closing price.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	prevDayPx: string;
	/**
	 * Daily notional volume.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	dayNtlVlm: string;
	/**
	 * Mark price.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	markPx: string;
	/**
	 * Mid price.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	midPx: string | null;
	/**
	 * Funding rate.
	 * @pattern ^-?[0-9]+(\.[0-9]+)?$
	 */
	funding: string;
	/**
	 * Total open interest.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	openInterest: string;
	/**
	 * Premium price.
	 * @pattern ^-?[0-9]+(\.[0-9]+)?$
	 */
	premium: string | null;
	/**
	 * Oracle price.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	oraclePx: string;
	/**
	 * Array of impact prices.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
	impactPxs: string[] | null;
	/**
	 * Daily volume in base currency.
	 * @pattern ^[0-9]+(\.[0-9]+)?$
	 */
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
	/**
	 * Funding rate.
	 * @pattern ^-?[0-9]+(\.[0-9]+)?$
	 */
	fundingRate: string;
	/**
	 * Premium price.
	 * @pattern ^-?[0-9]+(\.[0-9]+)?$
	 */
	premium: string;
	/** Funding record timestamp (ms since epoch). */
	time: number;
}
