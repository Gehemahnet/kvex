import { normalizeOptionalNumber } from "../../common/number.utils";
import { normalizeOptionalTimestamp } from "../../services/funding/funding-overview.utils";
import type { FundingOverviewExchangeCell } from "../../services/funding/funding-overview.types";
import type { OkxTicker } from "./okx.types";

/** Normalizes OKX swap instrument ids to KVEX base symbols. */
export const normalizeOkxSwapSymbol = (instId: string): string =>
	instId.trim().toUpperCase().replace(/-SWAP$/, "").split("-")[0] ?? instId;

/** Maps an OKX ticker payload into the shared funding overview cell shape. */
export const mapOkxTickerToFundingOverviewCell = (
	ticker: OkxTicker,
): FundingOverviewExchangeCell => {
	const bidPrice = normalizeOptionalNumber(ticker.bidPx);
	const bidSize = normalizeOptionalNumber(ticker.bidSz);
	const askPrice = normalizeOptionalNumber(ticker.askPx);
	const askSize = normalizeOptionalNumber(ticker.askSz);
	const markPrice = normalizeOptionalNumber(ticker.last);
	const timestamp = normalizeOptionalTimestamp(normalizeOptionalNumber(ticker.ts));
	const volume24h = normalizeOptionalNumber(ticker.volCcy24h);

	return {
		exchange: "okx",
		sourceSymbol: ticker.instId,
		...(bidPrice !== undefined ? { bidPrice } : {}),
		...(askPrice !== undefined ? { askPrice } : {}),
		...(bidSize !== undefined ? { bidSize } : {}),
		...(askSize !== undefined ? { askSize } : {}),
		...(markPrice !== undefined ? { markPrice } : {}),
		...(bidPrice !== undefined && askPrice !== undefined
			? { midPrice: (bidPrice + askPrice) / 2 }
			: {}),
		...(volume24h !== undefined ? { volume24h } : {}),
		...(timestamp !== undefined ? { timestamp } : {}),
	};
};
