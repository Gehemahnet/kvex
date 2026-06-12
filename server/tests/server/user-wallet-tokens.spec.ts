import { describe, expect, it } from "vitest";
import {
	parseCreateUserWalletTokenBody,
	parseUserWalletTokenId,
	parseWalletTokenNetwork,
} from "../../src/server/http/portfolio/user-wallet-tokens.utils";

const TOKEN = "0x2222222222222222222222222222222222222222";
const UPPER_TOKEN = `0x${TOKEN.slice(2).toUpperCase()}`;

describe("user wallet token http utils", () => {
	it("parses wallet token network query params", () => {
		expect(parseWalletTokenNetwork(new URL("http://localhost/portfolio/tokens")))
			.toBe("evm");
		expect(
			parseWalletTokenNetwork(
				new URL("http://localhost/portfolio/tokens?network=EVM"),
			),
		).toBe("evm");
		expect(() =>
			parseWalletTokenNetwork(
				new URL("http://localhost/portfolio/tokens?network=solana"),
			),
		).toThrow("Query param `network` must be `evm`");
	});

	it("parses create wallet token bodies", () => {
		expect(
			parseCreateUserWalletTokenBody({
				label: " USDC ",
				network: "EVM",
				token: UPPER_TOKEN,
			}),
		).toEqual({
			label: "USDC",
			network: "evm",
			token: TOKEN,
		});
	});

	it("rejects invalid create wallet token bodies", () => {
		expect(() => parseCreateUserWalletTokenBody({ token: 42 })).toThrow(
			"Field `token` must be a string",
		);
		expect(() =>
			parseCreateUserWalletTokenBody({
				network: "solana",
				token: TOKEN,
			}),
		).toThrow("Field `network` must be `evm`");
		expect(() =>
			parseCreateUserWalletTokenBody({
				token: "USDC",
			}),
		).toThrow("Wallet token must be `native` or an EVM token address");
	});

	it("parses wallet token ids for deletion", () => {
		expect(
			parseUserWalletTokenId(
				new URL("http://localhost/portfolio/tokens?id=token-id"),
			),
		).toBe("token-id");
		expect(() =>
			parseUserWalletTokenId(new URL("http://localhost/portfolio/tokens")),
		).toThrow("Query param `id` is required");
	});
});
