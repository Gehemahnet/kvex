import type { LowercaseExchange } from "../../common/types.ts";
import type { Add1hSuffixProps, UnifiedMarketItem } from "../../types";

export type SummaryData = Add1hSuffixProps<LowercaseExchange>;

export type MarketItemWithExchange = Partial<SummaryData> & {
	symbol: string;
	bestApr?: string;
	shortExchange?: LowercaseExchange;
	longExchange?: LowercaseExchange;
};

export type ExchangeFundingData = {
	name: LowercaseExchange;
	items: UnifiedMarketItem[];
};

export type MergeExchangesDataResult = {
	items: MarketItemWithExchange[];
	exchangeNames: Set<LowercaseExchange>;
};
