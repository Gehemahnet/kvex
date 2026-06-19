import { describe, expect, it, vi } from "vitest";
import {
	listExchangeAccountsForFeeRefresh,
	updateUserExchangeAccountPublicData,
} from "../../src/services/users/user-exchange-accounts/user-exchange-accounts.repository";
import { refreshUserExchangeFeeProfiles } from "../../src/services/portfolio/exchange-balances/exchange-balances.service";
import { refreshExchangeFeeProfiles } from "../../src/services/portfolio/exchange-balances/exchange-fee-profile-refresh.job";

vi.mock("../../src/services/users/user-exchange-accounts/user-exchange-accounts.repository", () => ({
	listExchangeAccountsForFeeRefresh: vi.fn(),
	updateUserExchangeAccountPublicData: vi.fn(),
}));

vi.mock("../../src/services/portfolio/exchange-balances/exchange-balances.service", () => ({
	refreshUserExchangeFeeProfiles: vi.fn(),
}));

describe("exchange fee profile refresh job", () => {
	it("persists refreshed profiles and skips accounts without updates", async () => {
		const accounts = [createAccount("first"), createAccount("second")];
		vi.mocked(listExchangeAccountsForFeeRefresh).mockResolvedValue(accounts);
		vi.mocked(refreshUserExchangeFeeProfiles)
			.mockResolvedValueOnce([{
				expiresAt: "2026-06-19T12:15:00.000Z",
				makerFeeRate: 0.0001,
				marketType: "perp",
				source: "api",
				takerFeeRate: 0.00035,
			}])
			.mockResolvedValueOnce(undefined);
		const db = { query: vi.fn() };

		await refreshExchangeFeeProfiles(db);

		expect(updateUserExchangeAccountPublicData).toHaveBeenCalledTimes(1);
		expect(updateUserExchangeAccountPublicData).toHaveBeenCalledWith(db, {
			id: "first",
			publicData: expect.objectContaining({
				feeProfiles: [expect.objectContaining({ takerFeeRate: 0.00035 })],
			}),
			userId: "user-id",
		});
	});
});

const createAccount = (id: string) => ({
	id,
	userId: "user-id",
	exchange: "hyperliquid" as const,
	label: id,
	status: "active" as const,
	publicData: {
		exchange: "hyperliquid" as const,
		address: "0x1111111111111111111111111111111111111111",
	},
	capabilities: { balances: true },
	createdAt: new Date("2026-01-01T00:00:00.000Z"),
	updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});
