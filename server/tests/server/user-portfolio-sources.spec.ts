import { describe, expect, it } from "vitest";
import {
	parseCreateUserPortfolioSourceBody,
	parseCreateUserPortfolioSourcesBody,
	parsePortfolioSourceId,
	parsePortfolioSourceNetwork,
	parseUpdateUserPortfolioSourceBody,
} from "../../src/server/http/portfolio/user-portfolio-sources.utils";

const ADDRESS = "0x1111111111111111111111111111111111111111";
const UPPER_ADDRESS = `0x${ADDRESS.slice(2).toUpperCase()}`;
const SOLANA_ADDRESS = "11111111111111111111111111111111";

describe("user portfolio source http utils", () => {
	it("parses source network query params", () => {
		expect(parsePortfolioSourceNetwork(new URL("http://localhost/portfolio/sources")))
			.toBeUndefined();
		expect(
			parsePortfolioSourceNetwork(
				new URL("http://localhost/portfolio/sources?network=SOLANA"),
			),
		).toBe("solana");
		expect(() =>
			parsePortfolioSourceNetwork(
				new URL("http://localhost/portfolio/sources?network=bitcoin"),
			),
		).toThrow("Query param `network` must be `evm` or `solana`");
	});

	it("parses create source bodies", () => {
		expect(
			parseCreateUserPortfolioSourceBody({
				address: UPPER_ADDRESS,
				label: " Main ",
				network: "EVM",
			}),
		).toEqual({
			address: ADDRESS,
			label: "Main",
			network: "evm",
		});
		expect(
			parseCreateUserPortfolioSourceBody({
				address: SOLANA_ADDRESS,
				network: "solana",
			}),
		).toEqual({
			address: SOLANA_ADDRESS,
			network: "solana",
		});
	});

	it("parses batch create source bodies", () => {
		expect(
			parseCreateUserPortfolioSourcesBody({
				sources: [
					{
						address: UPPER_ADDRESS,
						label: " Main ",
						network: "EVM",
					},
					{
						address: SOLANA_ADDRESS,
						network: "solana",
					},
				],
			}),
		).toEqual([
			{
				address: ADDRESS,
				label: "Main",
				network: "evm",
			},
			{
				address: SOLANA_ADDRESS,
				network: "solana",
			},
		]);
	});

	it("rejects empty batch create source bodies", () => {
		expect(() =>
			parseCreateUserPortfolioSourcesBody({
				address: UPPER_ADDRESS,
				network: "EVM",
			}),
		).toThrow("Field `sources` must be an array");
		expect(() => parseCreateUserPortfolioSourcesBody({ sources: "invalid" }))
			.toThrow("Field `sources` must be an array");
		expect(() => parseCreateUserPortfolioSourcesBody({ sources: [] }))
			.toThrow("Field `sources` must contain at least one source");
	});

	it("rejects invalid create source bodies", () => {
		expect(() =>
			parseCreateUserPortfolioSourceBody({
				address: ADDRESS,
				network: "bitcoin",
			}),
		).toThrow("Field `network` must be `evm` or `solana`");
		expect(() =>
			parseCreateUserPortfolioSourceBody({
				address: "not-address",
				network: "evm",
			}),
		).toThrow("Wallet address must be an EVM address");
	});

	it("parses update source bodies", () => {
		expect(
			parseUpdateUserPortfolioSourceBody({
				label: " Archive ",
				status: "disabled",
			}),
		).toEqual({
			label: "Archive",
			status: "disabled",
		});
		expect(() => parseUpdateUserPortfolioSourceBody({}))
			.toThrow("At least one of `label` or `status` must be provided");
		expect(() => parseUpdateUserPortfolioSourceBody({ status: "error" }))
			.toThrow("Field `status` must be `active` or `disabled`");
	});

	it("parses source ids for mutations", () => {
		expect(
			parsePortfolioSourceId(
				new URL("http://localhost/portfolio/sources?id=source-id"),
			),
		).toBe("source-id");
		expect(() =>
			parsePortfolioSourceId(new URL("http://localhost/portfolio/sources")),
		).toThrow("Query param `id` is required");
	});
});
