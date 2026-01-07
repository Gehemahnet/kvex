export interface MetaAndAssetCtxsRequest {
	type: "metaAndAssetCtxs";
}

export interface AssetContext {
	funding: string;
	openInterest: string;
	prevDayPx: string;
	dayNtlVlm: string;
	premium: string | null;
	oraclePx: string;
	markPx: string;
	midPx: string | null;
	impactPxs: [string, string] | null;
	dayBaseVlm: string;
}

export interface Universe {
	name: string;
	szDecimals: number;
	maxLeverage: number;
}

export interface Meta {
	universe: Universe[];
}

// Response is a tuple: [Meta, AssetContext[]]
export type MetaAndAssetCtxsResponse = [Meta, AssetContext[]];
