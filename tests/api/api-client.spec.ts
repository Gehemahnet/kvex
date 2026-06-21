import { afterEach, describe, expect, it, vi } from "vitest";
import { apiGet } from "../../src/api/api-client";
import { BACKEND_UNAVAILABLE_EVENT } from "../../src/api/api-client.events";

describe("api client backend availability", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("notifies the app when the backend cannot be reached", async () => {
		const dispatchEvent = vi.fn();

		vi.stubGlobal("window", { dispatchEvent });
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

		await expect(apiGet("/api/health")).rejects.toThrow("fetch failed");
		expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
			type: BACKEND_UNAVAILABLE_EVENT,
		}));
	});

	it("notifies only for server errors, not ordinary API errors", async () => {
		const dispatchEvent = vi.fn();

		vi.stubGlobal("window", { dispatchEvent });
		vi.stubGlobal("fetch", vi.fn()
			.mockResolvedValueOnce(new Response("", { status: 503 }))
			.mockResolvedValueOnce(new Response("", { status: 404 })));

		await expect(apiGet("/api/first")).rejects.toThrow();
		expect(dispatchEvent).toHaveBeenCalledTimes(1);

		await expect(apiGet("/api/second")).rejects.toThrow();
		expect(dispatchEvent).toHaveBeenCalledTimes(1);
	});
});
