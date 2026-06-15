import { describe, expect, it } from "vitest";
import { parseAuthSessionDays } from "#services/auth/auth-service/auth.config";

describe("auth config", () => {
	it("parses auth session days from env-compatible values", () => {
		expect(parseAuthSessionDays("14")).toBe(14);
		expect(parseAuthSessionDays("")).toBe(7);
		expect(parseAuthSessionDays(undefined)).toBe(7);
		expect(parseAuthSessionDays("0")).toBe(7);
		expect(parseAuthSessionDays("-1")).toBe(7);
		expect(parseAuthSessionDays("1.5")).toBe(7);
		expect(parseAuthSessionDays("not-a-number")).toBe(7);
	});
});
