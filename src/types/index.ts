export type UnifiedMarketItem = {
	/** Trading pair symbol */
	symbol: string;
	/** Maximum leverage allowed on this symbol when opening positions */
	maxLeverage?: number;
	/** Maximum order size (denominated in USD) */
	maxOrderSize: string;
	/** Tick size. All prices are denominated as a multiple of this */
	tickSize: string;
	fundingRate: string;
};

export type DecentralizedExchange = "paradex" | "pacifica";

type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
	? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
	: S;

export type SnakeToCamelObject<T> = {
	[K in keyof T as SnakeToCamel<K & string>]: T[K] extends object
		? T[K] extends Array<infer U>
			? Array<SnakeToCamelObject<U>>
			: SnakeToCamelObject<T[K]>
		: T[K];
};

export type Add1hSuffixProps<T extends string> = {
	[K in T as `${K}1h`]: string;
};
