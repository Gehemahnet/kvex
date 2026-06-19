import { describe, expect, it } from "vitest";
import { addWalletSourceLabels } from "../../src/server/http/portfolio/portfolio-balances.utils";

describe("portfolio balances utils", () => {
	it("adds saved wallet labels to balances, errors, and source results", () => {
		const result = addWalletSourceLabels({
			networks: ["evm"],
			tokens: ["all"],
			balances: [{
				token: "native",
				rawBalance: "1",
				formattedBalance: "0.000000000000000001",
				source: { type: "wallet", network: "evm", address: "0xABC" },
			}],
			errors: [{
				address: "0xabc",
				token: "all",
				code: "BALANCE_FETCH_FAILED",
				message: "RPC unavailable",
			}],
			sourceResults: [{
				address: "0xabc",
				network: "evm",
				balancesCount: 1,
				errorsCount: 1,
				status: "partial",
			}],
		}, [{
			id: "source-id",
			userId: "user-id",
			type: "wallet",
			network: "evm",
			address: "0xabc",
			label: "Treasury",
			status: "active",
			createdAt: new Date("2026-01-01T00:00:00.000Z"),
			updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		}]);

		expect(result.balances[0]?.source.label).toBe("Treasury");
		expect(result.errors[0]?.label).toBe("Treasury");
		expect(result.sourceResults[0]?.label).toBe("Treasury");
	});
});
