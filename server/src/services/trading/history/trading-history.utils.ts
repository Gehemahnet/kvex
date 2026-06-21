import type { Exchange } from "#common/types";
import type { TradingHistoryPosition } from "./trading-history.types";

export type TradingHistoryFill = {
	id: string;
	price: string;
	realizedPnlUsd?: string;
	side: "buy" | "sell";
	size: string;
	timestamp: string;
};

type TradingHistoryMetadata = {
	accountId: string;
	exchange: Exchange;
	quoteAsset: TradingHistoryPosition["quoteAsset"];
	sourceSymbol: string;
	symbol: string;
};

type PositionCycle = {
	closedSize: number;
	entryNotional: number;
	exitNotional: number;
	firstFillId: string;
	maxSize: number;
	openedAt: string;
	openedSize: number;
	realizedPnlUsd: number;
	side: TradingHistoryPosition["side"];
	signedSize: number;
};

/** Reconstructs complete position cycles from chronological exchange fills. */
export const groupFillsIntoClosedPositions = (
	fills: TradingHistoryFill[],
	metadata: TradingHistoryMetadata,
): TradingHistoryPosition[] => {
	const sortedFills = [...fills].sort((left, right) =>
		left.timestamp.localeCompare(right.timestamp)
	);
	const positions: TradingHistoryPosition[] = [];
	let cycle: PositionCycle | undefined;

	for (const fill of sortedFills) {
		const price = Number.parseFloat(fill.price);
		let remainingSize = Number.parseFloat(fill.size);
		const direction = fill.side === "buy" ? 1 : -1;

		if (!Number.isFinite(price) || !Number.isFinite(remainingSize) || remainingSize <= 0) {
			continue;
		}

		while (remainingSize > 0) {
			if (cycle === undefined) {
				cycle = createPositionCycle(fill, direction, remainingSize, price);
				remainingSize = 0;
				continue;
			}

			if (Math.sign(cycle.signedSize) === direction) {
				cycle.signedSize += direction * remainingSize;
				cycle.entryNotional += remainingSize * price;
				cycle.openedSize += remainingSize;
				cycle.maxSize = Math.max(cycle.maxSize, Math.abs(cycle.signedSize));
				remainingSize = 0;
				continue;
			}

			const closingSize = Math.min(Math.abs(cycle.signedSize), remainingSize);
			cycle.signedSize += direction * closingSize;
			cycle.closedSize += closingSize;
			cycle.exitNotional += closingSize * price;
			cycle.realizedPnlUsd += parseOptionalNumber(fill.realizedPnlUsd);
			remainingSize -= closingSize;

			if (Math.abs(cycle.signedSize) < Number.EPSILON) {
				positions.push(toTradingHistoryPosition(cycle, fill.timestamp, metadata));
				cycle = undefined;
			}
		}
	}

	return positions;
};

const createPositionCycle = (
	fill: TradingHistoryFill,
	direction: 1 | -1,
	size: number,
	price: number,
): PositionCycle => ({
	closedSize: 0,
	entryNotional: size * price,
	exitNotional: 0,
	firstFillId: fill.id,
	maxSize: size,
	openedAt: fill.timestamp,
	openedSize: size,
	realizedPnlUsd: 0,
	side: direction === 1 ? "long" : "short",
	signedSize: direction * size,
});

const toTradingHistoryPosition = (
	cycle: PositionCycle,
	closedAt: string,
	metadata: TradingHistoryMetadata,
): TradingHistoryPosition => ({
	...metadata,
	closedAt,
	entryPrice: formatComputedDecimal(cycle.entryNotional / cycle.openedSize),
	exitPrice: formatComputedDecimal(cycle.exitNotional / cycle.closedSize),
	id: `${metadata.accountId}:${metadata.sourceSymbol}:${cycle.firstFillId}:${closedAt}`,
	openedAt: cycle.openedAt,
	realizedPnlUsd: formatComputedDecimal(cycle.realizedPnlUsd),
	side: cycle.side,
	size: formatComputedDecimal(cycle.maxSize),
});

const formatComputedDecimal = (value: number): string =>
	String(Number.parseFloat(value.toPrecision(15)));

const parseOptionalNumber = (value?: string): number => {
	if (value === undefined) return 0;

	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed) ? parsed : 0;
};
