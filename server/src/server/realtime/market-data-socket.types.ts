import type {
	MarketSnapshotsQuery,
	MarketSnapshotsResponse,
} from "#services/markets/market-snapshots/market-snapshots.types";
import type {
	SpreadsQuery,
	SpreadsResponse,
} from "#services/spreads/spreads-core/spreads.types";

export type MarketSnapshotsSubscribePayload = Partial<MarketSnapshotsQuery>;

export type SpreadsSubscribePayload = Partial<SpreadsQuery>;

export type MarketDataSocketError = {
	message: string;
	code: string;
};

export type MarketDataServerToClientEvents = {
	"market:snapshots:update": (data: MarketSnapshotsResponse) => void;
	"spreads:update": (data: SpreadsResponse) => void;
	"market-data:error": (error: MarketDataSocketError) => void;
};

export type MarketDataClientToServerEvents = {
	"market:snapshots:subscribe": (
		payload?: MarketSnapshotsSubscribePayload,
	) => void;
	"market:snapshots:unsubscribe": () => void;
	"spreads:subscribe": (payload?: SpreadsSubscribePayload) => void;
	"spreads:unsubscribe": () => void;
};
