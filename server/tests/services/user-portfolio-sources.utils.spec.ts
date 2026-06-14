import { describe, expect, it } from "vitest";
import {
	isPortfolioSourceStatus,
	mapUserPortfolioSourceRow,
	normalizePortfolioSourceAddress,
	normalizePortfolioSourceLabel,
} from "../../src/services/portfolio/user-portfolio-sources.utils";
import type { UserPortfolioSourceRow } from "../../src/services/portfolio/user-portfolio-sources.types";

describe("user portfolio source utils", () => {
	it("normalizes labels", () => {
		expect(normalizePortfolioSourceLabel("  Main wallet  ")).toBe("Main wallet");
		expect(normalizePortfolioSourceLabel("   ")).toBeUndefined();
		expect(normalizePortfolioSourceLabel(undefined)).toBeUndefined();
	});

	it("normalizes EVM and Solana wallet addresses", () => {
		expect(
			normalizePortfolioSourceAddress(
				"evm",
				"0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
			),
		).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
		expect(
			normalizePortfolioSourceAddress("solana", "11111111111111111111111111111111"),
		).toBe("11111111111111111111111111111111");
		expect(() => normalizePortfolioSourceAddress("evm", "not-address"))
			.toThrow("Wallet address must be an EVM address");
		expect(() => normalizePortfolioSourceAddress("solana", "not-address"))
			.toThrow("Wallet address must be a Solana address");
	});

	it("checks supported source statuses", () => {
		expect(isPortfolioSourceStatus("active")).toBe(true);
		expect(isPortfolioSourceStatus("disabled")).toBe(true);
		expect(isPortfolioSourceStatus("error")).toBe(false);
	});

	it("maps database rows to domain models", () => {
		const row: UserPortfolioSourceRow = {
			id: "source-id",
			user_id: "user-id",
			type: "wallet",
			network: "evm",
			address: "0x1111111111111111111111111111111111111111",
			label: null,
			status: "active",
			created_at: new Date("2026-06-12T00:00:00.000Z"),
			updated_at: new Date("2026-06-12T00:00:00.000Z"),
		};

		expect(mapUserPortfolioSourceRow(row)).toEqual({
			id: "source-id",
			userId: "user-id",
			type: "wallet",
			network: "evm",
			address: "0x1111111111111111111111111111111111111111",
			status: "active",
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
	});
});
