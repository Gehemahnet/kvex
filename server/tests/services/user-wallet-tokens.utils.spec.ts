import { describe, expect, it } from "vitest";
import {
	mapUserWalletTokenRow,
	normalizeWalletToken,
	normalizeWalletTokenLabel,
} from "../../src/services/portfolio/user-wallet-tokens.utils";
import type { UserWalletTokenRow } from "../../src/services/portfolio/user-wallet-tokens.types";

describe("user wallet token utils", () => {
	it("normalizes labels", () => {
		expect(normalizeWalletTokenLabel("  USDC  ")).toBe("USDC");
		expect(normalizeWalletTokenLabel("   ")).toBeUndefined();
		expect(normalizeWalletTokenLabel(undefined)).toBeUndefined();
	});

	it("normalizes native and EVM token addresses", () => {
		expect(normalizeWalletToken("evm", " Native ")).toBe("native");
		expect(
			normalizeWalletToken("evm", "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"),
		).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
		expect(() => normalizeWalletToken("evm", "USDC")).toThrow(
			"Wallet token must be `native` or an EVM token address",
		);
	});

	it("maps database rows to domain models", () => {
		const row: UserWalletTokenRow = {
			id: "token-id",
			user_id: "user-id",
			network: "evm",
			token: "native",
			label: null,
			created_at: new Date("2026-06-12T00:00:00.000Z"),
			updated_at: new Date("2026-06-12T00:00:00.000Z"),
		};

		expect(mapUserWalletTokenRow(row)).toEqual({
			id: "token-id",
			userId: "user-id",
			network: "evm",
			token: "native",
			createdAt: row.created_at,
			updatedAt: row.updated_at,
		});
	});
});
