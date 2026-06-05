import { useQueryClient } from "@tanstack/vue-query";
import { onScopeDispose, watch, type MaybeRefOrGetter, toValue } from "vue";
import {
	MARKET_DATA_SOCKET_EVENTS,
} from "../../common/market-data-socket.constants";
import { getMarketDataSocket } from "../../common/market-data-socket";
import type { FundingExchange } from "../FundingOverview/FundingOverview.types";
import { createSpreadsQueryKey } from "./SpreadsOverview.query";
import type { SpreadsResponse } from "./SpreadsOverview.types";

type UseSpreadsSocketUpdatesParams = {
	enabled: MaybeRefOrGetter<boolean>;
	exchanges: MaybeRefOrGetter<FundingExchange[]>;
	symbol?: MaybeRefOrGetter<string>;
	minPriceSpreadPercent: MaybeRefOrGetter<number>;
	maxSnapshotAgeMs: MaybeRefOrGetter<number>;
	positionSizeUsd: MaybeRefOrGetter<number>;
	minOccurrences: MaybeRefOrGetter<number>;
	minLifetimeMs: MaybeRefOrGetter<number>;
	holdingPeriodHours: MaybeRefOrGetter<number>;
};

/**
 * Subscribes to live spread updates and writes them into the matching Vue Query
 * cache entry so the table can update without a full REST refetch.
 */
export const useSpreadsSocketUpdates = (
	params: UseSpreadsSocketUpdatesParams,
) => {
	const queryClient = useQueryClient();
	const socket = getMarketDataSocket();

	const unsubscribe = () => {
		socket.emit(MARKET_DATA_SOCKET_EVENTS.SPREADS_UNSUBSCRIBE);
	};

	const stopWatch = watch(
		() => ({
			enabled: toValue(params.enabled),
			exchanges: toValue(params.exchanges),
			symbol: params.symbol ? toValue(params.symbol).trim().toUpperCase() : "",
			minPriceSpreadPercent: toValue(params.minPriceSpreadPercent),
			maxSnapshotAgeMs: toValue(params.maxSnapshotAgeMs),
			positionSizeUsd: toValue(params.positionSizeUsd),
			minOccurrences: toValue(params.minOccurrences),
			minLifetimeMs: toValue(params.minLifetimeMs),
			holdingPeriodHours: toValue(params.holdingPeriodHours),
		}),
		(query) => {
			unsubscribe();

			if (!query.enabled || query.exchanges.length <= 1) {
				return;
			}

			if (!socket.connected) {
				socket.connect();
			}

			socket.emit(MARKET_DATA_SOCKET_EVENTS.SPREADS_SUBSCRIBE, {
				exchanges: query.exchanges,
				...(query.symbol ? { symbol: query.symbol } : {}),
				minPriceSpreadPercent: query.minPriceSpreadPercent,
				maxSnapshotAgeMs: query.maxSnapshotAgeMs,
				...(query.positionSizeUsd > 0
					? { positionSizeUsd: query.positionSizeUsd }
					: {}),
				...(query.minOccurrences > 0
					? { minOccurrences: Math.floor(query.minOccurrences) }
					: {}),
				...(query.minLifetimeMs > 0
					? { minLifetimeMs: query.minLifetimeMs }
					: {}),
				...(query.holdingPeriodHours > 0
					? { holdingPeriodHours: query.holdingPeriodHours }
					: {}),
			});
		},
		{ immediate: true },
	);

	const handleUpdate = (response: SpreadsResponse) => {
		queryClient.setQueryData(createSpreadsQueryKey({
			exchanges: response.exchanges,
			symbol: response.symbol ?? "",
			minPriceSpreadPercent: response.minPriceSpreadPercent,
			maxSnapshotAgeMs: response.maxSnapshotAgeMs,
			positionSizeUsd: response.positionSizeUsd,
			minOccurrences: response.minOccurrences,
			minLifetimeMs: response.minLifetimeMs,
			holdingPeriodHours: response.holdingPeriodHours,
		}), response);
	};

	socket.on(MARKET_DATA_SOCKET_EVENTS.SPREADS_UPDATE, handleUpdate);

	onScopeDispose(() => {
		stopWatch();
		socket.off(MARKET_DATA_SOCKET_EVENTS.SPREADS_UPDATE, handleUpdate);
		unsubscribe();
	});
};
