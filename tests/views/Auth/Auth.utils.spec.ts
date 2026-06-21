import { describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../../src/api/api-client";
import {
	isTransientAuthError,
	retryTransientAuthRequest,
} from "../../../src/views/Auth/Auth.utils";

describe("Auth utils", () => {
	it("retries temporary backend disconnects", async () => {
		const request = vi.fn()
			.mockRejectedValueOnce(new TypeError("fetch failed"))
			.mockRejectedValueOnce(new ApiRequestError("Unavailable", 503))
			.mockResolvedValue("session");
		const wait = vi.fn().mockResolvedValue(undefined);

		await expect(retryTransientAuthRequest(request, wait)).resolves.toBe("session");
		expect(request).toHaveBeenCalledTimes(3);
		expect(wait).toHaveBeenCalledTimes(2);
	});

	it("does not retry an invalid authenticated request", async () => {
		const error = new ApiRequestError("Unauthorized", 401);
		const request = vi.fn().mockRejectedValue(error);
		const wait = vi.fn().mockResolvedValue(undefined);

		await expect(retryTransientAuthRequest(request, wait)).rejects.toBe(error);
		expect(request).toHaveBeenCalledTimes(1);
		expect(wait).not.toHaveBeenCalled();
		expect(isTransientAuthError(error)).toBe(false);
	});
});
