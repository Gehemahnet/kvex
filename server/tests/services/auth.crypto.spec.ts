import { describe, expect, it } from "vitest";
import {
	createPasswordResetToken,
	hashPassword,
	hashPasswordResetToken,
	signAuthToken,
	verifyAuthToken,
	verifyPassword,
} from "#services/auth/auth-service/auth.crypto";

describe("auth crypto", () => {
	it("hashes and verifies passwords", async () => {
		const passwordHash = await hashPassword("correct-password");

		await expect(verifyPassword("correct-password", passwordHash)).resolves.toBe(true);
		await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(false);
		expect(passwordHash).not.toContain("correct-password");
	});

	it("signs and verifies auth tokens", () => {
		const token = signAuthToken(
			{
				login: "trader",
				secret: "test-secret",
				ttlSeconds: 60,
				userId: "user-id",
			},
			100,
		);

		expect(verifyAuthToken(token, "test-secret", 101)).toMatchObject({
			sub: "user-id",
			login: "trader",
			iat: 100,
		});
	});

	it("rejects expired or tampered tokens", () => {
		const token = signAuthToken(
			{
				login: "trader",
				secret: "test-secret",
				ttlSeconds: 60,
				userId: "user-id",
			},
			100,
		);
		const tamperedToken = `${token.slice(0, -1)}x`;

		expect(() => verifyAuthToken(token, "test-secret", 161)).toThrow(
			"Auth token expired",
		);
		expect(() => verifyAuthToken(tamperedToken, "test-secret", 101)).toThrow(
			"Invalid auth token",
		);
	});

	it("creates and hashes password reset tokens", () => {
		const token = createPasswordResetToken();
		const tokenHash = hashPasswordResetToken(token);

		expect(token).toHaveLength(43);
		expect(tokenHash).not.toBe(token);
		expect(hashPasswordResetToken(token)).toBe(tokenHash);
	});
});
