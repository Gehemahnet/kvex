import { describe, expect, it } from "vitest";
import {
	normalizeUserEmail,
	normalizeUserLogin,
} from "#services/users/users-core/users.utils";

describe("users utils", () => {
	it("normalizes user login", () => {
		expect(normalizeUserLogin(" Trader_01 ")).toBe("trader_01");
		expect(normalizeUserEmail(" Trader@Example.COM ")).toBe("trader@example.com");
	});
});
