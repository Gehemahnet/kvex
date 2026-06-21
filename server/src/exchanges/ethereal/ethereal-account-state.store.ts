import type {
	EtherealAccountFill,
	EtherealAccountPosition,
} from "./ethereal.types";

const positionsBySubaccount = new Map<string, Map<string, EtherealAccountPosition>>();
const fillsBySubaccount = new Map<string, EtherealAccountFill[]>();
const hydratedSubaccounts = new Set<string>();

export const replaceEtherealAccountPositions = (
	subaccountId: string,
	positions: EtherealAccountPosition[],
): void => {
	positionsBySubaccount.set(
		subaccountId,
		new Map(positions.map((position) => [position.id, position])),
	);
	hydratedSubaccounts.add(subaccountId);
};

export const upsertEtherealAccountPositions = (
	subaccountId: string,
	positions: EtherealAccountPosition[],
): void => {
	const stored = positionsBySubaccount.get(subaccountId) ?? new Map();

	for (const position of positions) {
		if (Number.parseFloat(position.size) === 0) stored.delete(position.id);
		else stored.set(position.id, { ...stored.get(position.id), ...position });
	}

	positionsBySubaccount.set(subaccountId, stored);
};

export const getEtherealAccountPositions = (
	subaccountId: string,
): EtherealAccountPosition[] | undefined =>
	hydratedSubaccounts.has(subaccountId)
		? [...(positionsBySubaccount.get(subaccountId)?.values() ?? [])]
		: undefined;

export const updateEtherealAccountPositionMarks = (
	sourceSymbol: string,
	markPriceValue: string,
	updatedAt: number,
): void => {
	const markPrice = Number.parseFloat(markPriceValue);

	if (!Number.isFinite(markPrice)) return;

	for (const positions of positionsBySubaccount.values()) {
		for (const [positionId, position] of positions) {
			if (position.sourceSymbol !== sourceSymbol) continue;

			const size = Math.abs(Number.parseFloat(position.size));
			const cost = Number.parseFloat(position.cost);

			if (!Number.isFinite(size) || !Number.isFinite(cost)) continue;

			const unrealizedPnl = position.side === 0
				? size * markPrice - cost
				: cost - size * markPrice;

			positions.set(positionId, {
				...position,
				unrealizedPnl: String(unrealizedPnl),
				updatedAt,
			});
		}
	}
};

export const appendEtherealAccountFills = (
	subaccountId: string,
	fills: EtherealAccountFill[],
): void => {
	const merged = new Map(
		[...fills, ...(fillsBySubaccount.get(subaccountId) ?? [])]
			.map((fill) => [fill.id, fill]),
	);
	fillsBySubaccount.set(
		subaccountId,
		[...merged.values()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 200),
	);
};

export const getEtherealAccountFills = (
	subaccountId: string,
): EtherealAccountFill[] => fillsBySubaccount.get(subaccountId) ?? [];

export const invalidateEtherealAccountPositionSnapshots = (): void => {
	hydratedSubaccounts.clear();
};

export const clearEtherealAccountStateStore = (): void => {
	positionsBySubaccount.clear();
	fillsBySubaccount.clear();
	hydratedSubaccounts.clear();
};
