import { describe, expect, it } from "vitest";
import {
	getAuthRequestToken,
	getBearerToken,
	getCsrfRequestToken,
	parsePasswordResetConfirmBody,
	parsePasswordResetRequestBody,
	parseAuthCredentialsBody,
} from "../../src/server/http/auth/auth.utils";

describe("auth http utils", () => {
	it("parses credentials bodies", () => {
		expect(
			parseAuthCredentialsBody({
				login: "user",
				password: "password",
			}),
		).toEqual({
			login: "user",
			password: "password",
		});
	});

	it("extracts bearer tokens", () => {
		expect(
			getBearerToken({
				headers: {
					authorization: "Bearer token",
				},
			} as never),
		).toBe("token");
	});

	it("extracts auth tokens from bearer headers or cookies", () => {
		expect(
			getAuthRequestToken({
				headers: {
					authorization: "Bearer bearer-token",
				},
			} as never),
		).toBe("bearer-token");
		expect(
			getAuthRequestToken({
				headers: {
					cookie: "theme=dark; kvex_auth=cookie-token",
				},
			} as never),
		).toBe("cookie-token");
	});

	it("extracts csrf tokens from headers or cookies", () => {
		expect(
			getCsrfRequestToken({
				headers: {
					"x-csrf-token": "header-csrf",
					cookie: "kvex_csrf=cookie-csrf",
				},
			} as never),
		).toBe("header-csrf");
		expect(
			getCsrfRequestToken({
				headers: {
					cookie: "kvex_csrf=cookie-csrf",
				},
			} as never),
		).toBe("cookie-csrf");
	});

	it("rejects invalid bearer headers", () => {
		expect(
			getBearerToken({
				headers: {},
			} as never),
		).toBeUndefined();
		expect(() =>
			getAuthRequestToken({
				headers: {},
			} as never),
		).toThrow("Authorization token is required");
	});

	it("parses password reset request and confirm bodies", () => {
		expect(parsePasswordResetRequestBody({ login: "user" })).toEqual({
			login: "user",
		});
		expect(
			parsePasswordResetConfirmBody({
				token: "token",
				password: "new-password",
			}),
		).toEqual({
			token: "token",
			password: "new-password",
		});
	});
});
