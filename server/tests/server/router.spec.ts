import { describe, expect, it } from "vitest";
import { router } from "../../src/server/router";

type MockResponse = {
	statusCode?: number;
	headers?: Record<string, string>;
	body?: string;
	getHeader: (name: string) => string | undefined;
	on: (event: string, listener: () => void) => MockResponse;
	writeHead: (statusCode: number, headers: Record<string, string>) => MockResponse;
	end: (body: string) => string;
};

const createMockResponse = (): MockResponse => ({
	getHeader(name) {
		return this.headers?.[name];
	},
	on() {
		return this;
	},
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
	it("returns backend health without authentication", async () => {
		const response = createMockResponse();

		await router(
			{ method: "GET", url: "/health" },
			response as never,
		);

		expect(response.statusCode).toBe(200);
		expect(JSON.parse(response.body ?? "")).toEqual({ status: "ok" });
	});

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

	it("returns 400 with explanation for invalid funding overview query", async () => {
		const response = createMockResponse();

		await router(
			{ method: "GET", url: "/funding/overview?timeframe=HOUR" },
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

	it("returns 405 for unsupported market snapshots method", async () => {
		const response = createMockResponse();

		await router(
			{ method: "POST", url: "/markets/snapshots" },
			response as never,
		);

		expect(response.statusCode).toBe(405);
		expect(JSON.parse(response.body ?? "")).toEqual({
			error: {
				code: "METHOD_NOT_ALLOWED",
				message: "Method POST is not allowed for /markets/snapshots",
			},
		});
	});

	it("returns 400 with explanation for invalid market snapshots query", async () => {
		const response = createMockResponse();

		await router(
			{ method: "GET", url: "/markets/snapshots?exchanges=unknown" },
			response as never,
		);

		expect(response.statusCode).toBe(400);
		expect(JSON.parse(response.body ?? "")).toEqual({
			error: {
				code: "UNSUPPORTED_EXCHANGES",
				message: "Unsupported exchanges: unknown",
			},
		});
	});

	it("returns 400 with explanation for invalid spreads query", async () => {
		const response = createMockResponse();

		await router(
			{ method: "GET", url: "/spreads?minPriceSpreadPercent=-1" },
			response as never,
		);

		expect(response.statusCode).toBe(400);
		expect(JSON.parse(response.body ?? "")).toEqual({
			error: {
				code: "INVALID_PERCENT_FILTER",
				message:
					"Query param `minPriceSpreadPercent` must be a non-negative number",
			},
		});
	});
});
