import { describe, expect, it } from "vitest";
import {
	parseCreateUserExchangeTokenBody,
	parseUpdateUserExchangeTokenBody,
} from "../../src/server/http/portfolio/user-exchange-tokens.utils";

describe("user exchange token utils", () => {
	it("accepts variational exchange tokens", () => {
		expect(
			parseCreateUserExchangeTokenBody({
				exchange: "variational",
				apiKey: "test-key",
				apiSecret: "test-secret",
				permissions: ["balances"],
			}),
		).toEqual({
			exchange: "variational",
			label: "variational token",
			publicData: {
				exchange: "variational",
				apiKey: "test-key",
				apiSecret: "test-secret",
				permissions: ["balances"],
			},
			capabilities: {
				balances: true,
				orders: false,
				trades: false,
			},
		});
	});

	it("trims exchange token labels on update", () => {
		expect(parseUpdateUserExchangeTokenBody({ label: "  Trading vault  " }))
			.toEqual({ label: "Trading vault" });
	});
});
