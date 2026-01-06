import type { Exchange } from "../../common/types.ts";
import type { Add1hSuffixProps } from "../../types";

export type SummaryData = Add1hSuffixProps<Lowercase<Exchange>>;

export type MarketItemWithExchange = Partial<SummaryData> & {
	symbol: string;
};
