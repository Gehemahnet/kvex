import type { SnapshotResponse } from "../../../common/types.ts";
import { createParadexClient } from "../client.ts";

export const createParadexAdapter = (cfg?: any) => {
	const client = createParadexClient(cfg);
	const snapshotFn = async (
		market: string,
		depth?: number,
	): Promise<SnapshotResponse> => {
		return client.getSnapshot(market, depth);
	};

	const subscribeFn = (market: string, onDelta: (d: any) => void) => {
		return client.subscribeWs(market, (raw) => {
			// normalize expected shapes: try result.data or params.data or raw
			const payload = raw?.result ?? raw?.params ?? raw;
			const channel = payload?.channel ?? payload?.channel_name;
			if (channel && channel.includes("orderbook"))
				onDelta(payload.data ?? payload);
		});
	};
	const place = (o: any) => client.placeOrder(o);
	const cancel = (id: string) => client.cancelOrder(id);
	return { snapshotFn, subscribeFn, place, cancel };
};
