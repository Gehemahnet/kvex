import { describe, expect, it } from "vitest";
import { router } from "../../src/server/router";

type MockResponse = {
	statusCode?: number;
	headers?: Record<string, string>;
	body?: string;
	writeHead: (statusCode: number, headers: Record<string, string>) => MockResponse;
	end: (body: string) => string;
};

const createMockResponse = (): MockResponse => ({
	writeHead(statusCode, headers) {
		this.statusCode = statusCode;
		this.headers = headers;
		return this;
	},
	end(body) {
		this.body = body;
		return body;
	},
});

describe("router error handling", () => {
	it("returns 404 for unknown routes", async () => {
		const response = createMockResponse();

		await router(
			{ method: "GET", url: "/unknown" },
			response as never,
		);

		expect(response.statusCode).toBe(404);
		expect(JSON.parse(response.body ?? "")).toEqual({
			error: {
				code: "ROUTE_NOT_FOUND",
				message: "Route /unknown was not found",
			},
		});
	});

	it("returns 405 for unsupported method", async () => {
		const response = createMockResponse();

		await router(
			{ method: "POST", url: "/funding" },
			response as never,
		);

		expect(response.statusCode).toBe(405);
		expect(JSON.parse(response.body ?? "")).toEqual({
			error: {
				code: "METHOD_NOT_ALLOWED",
				message: "Method POST is not allowed for /funding",
			},
		});
	});

	it("returns 400 with explanation for invalid funding query", async () => {
		const response = createMockResponse();

		await router(
			{ method: "GET", url: "/funding?symbol=BTC&timeframe=HOUR" },
			response as never,
		);

		expect(response.statusCode).toBe(400);
		expect(JSON.parse(response.body ?? "")).toEqual({
			error: {
				code: "INVALID_TIMEFRAME",
				message: "Query param `timeframe` must be one of DAY,WEEK,MONTH,YEAR",
			},
		});
	});
});
