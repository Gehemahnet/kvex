import { beforeEach, describe, expect, it } from "vitest";
import {
	clearEtherealAccountStateStore,
	getEtherealAccountPositions,
	replaceEtherealAccountPositions,
	updateEtherealAccountPositionMarks,
} from "../../src/exchanges/ethereal/ethereal-account-state.store";

describe("ethereal account state store", () => {
	beforeEach(clearEtherealAccountStateStore);

	it.each([
		{ side: 0 as const, expectedPnl: "20" },
		{ side: 1 as const, expectedPnl: "-20" },
	])("recalculates $side position PnL from mark price", ({ side, expectedPnl }) => {
		replaceEtherealAccountPositions("subaccount-1", [{
			cost: "200",
			id: "position-1",
			side,
			size: "2",
			sourceSymbol: "ETHUSD",
			subaccountId: "subaccount-1",
			updatedAt: 1,
		}]);

		updateEtherealAccountPositionMarks("ETHUSD", "110", 2);

		expect(getEtherealAccountPositions("subaccount-1")).toEqual([
			expect.objectContaining({ unrealizedPnl: expectedPnl, updatedAt: 2 }),
		]);
	});
});
