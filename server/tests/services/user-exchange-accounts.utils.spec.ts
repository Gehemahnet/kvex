import { describe, expect, it } from "vitest";
import {
	createUserExchangeData,
	normalizeUserExchangeAccountLabel,
} from "../../src/services/users/user-exchange-accounts.utils";

describe("user exchange accounts utils", () => {
	it("normalizes labels and preserves exchange discriminator", () => {
		expect(normalizeUserExchangeAccountLabel(" Main account ")).toBe("Main account");
		expect(
			createUserExchangeData("hyperliquid", {
				address: "0x123",
			}),
		).toEqual({
			exchange: "hyperliquid",
			address: "0x123",
		});
	});
});
