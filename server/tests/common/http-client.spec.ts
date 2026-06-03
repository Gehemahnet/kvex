import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchHttpClient, UpstreamHttpError } from "../../src/common/http-client";

const createJsonResponse = (body: object, status: number = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
		statusText: status === 200 ? "OK" : "Error",
		headers: {
			"Content-Type": "application/json",
		},
	});

describe("FetchHttpClient", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("retries rate-limited requests before returning JSON", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(createJsonResponse({}, 429))
			.mockResolvedValueOnce(createJsonResponse({ ok: true }));
		const sleep = vi.fn().mockResolvedValue(undefined);
		const client = new FetchHttpClient({ retryAttempts: 1, sleep });

		vi.stubGlobal("fetch", fetchMock);

		await expect(client.get("https://example.test")).resolves.toEqual({
			ok: true,
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledOnce();
	});

	it("does not retry non-retryable client errors", async () => {
		const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({}, 404));
		const client = new FetchHttpClient({ retryAttempts: 2 });

		vi.stubGlobal("fetch", fetchMock);

		await expect(client.get("https://example.test")).rejects.toBeInstanceOf(
			UpstreamHttpError,
		);
		expect(fetchMock).toHaveBeenCalledOnce();
	});
});
