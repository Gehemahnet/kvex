import { describe, expect, it } from "vitest";
import {
	decodeErc20Decimals,
	decodeErc20Symbol,
	decodeEvmUint256,
	encodeErc20BalanceOfCall,
	formatTokenUnits,
	isEvmAddress,
	normalizeEvmAddress,
} from "#services/portfolio/wallet-balances/evm-wallet-balances.utils";

describe("evm wallet balance utils", () => {
	it("validates and normalizes EVM addresses", () => {
		expect(isEvmAddress("0x1111111111111111111111111111111111111111")).toBe(true);
		expect(isEvmAddress("0x111")).toBe(false);
		expect(
			normalizeEvmAddress("  0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA  "),
		).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
	});

	it("encodes ERC-20 balanceOf calls", () => {
		expect(
			encodeErc20BalanceOfCall("0x1111111111111111111111111111111111111111"),
		).toBe(
			"0x70a082310000000000000000000000001111111111111111111111111111111111111111",
		);
	});

	it("decodes uint256 JSON-RPC hex values", () => {
		expect(decodeEvmUint256("0xde0b6b3a7640000")).toBe("1000000000000000000");
		expect(decodeEvmUint256("0x")).toBe("0");
	});

	it("decodes ERC-20 decimals", () => {
		expect(decodeErc20Decimals("0x12")).toBe(18);
	});

	it("decodes dynamic and bytes32 ERC-20 symbols", () => {
		const dynamicSymbol =
			"0x0000000000000000000000000000000000000000000000000000000000000020" +
			"0000000000000000000000000000000000000000000000000000000000000004" +
			"5553444300000000000000000000000000000000000000000000000000000000";
		const bytes32Symbol =
			"0x5553445400000000000000000000000000000000000000000000000000000000";

		expect(decodeErc20Symbol(dynamicSymbol)).toBe("USDC");
		expect(decodeErc20Symbol(bytes32Symbol)).toBe("USDT");
	});

	it("formats token units without losing integer precision", () => {
		expect(formatTokenUnits("1000000000000000000", 18)).toBe("1");
		expect(formatTokenUnits("1234500", 6)).toBe("1.2345");
		expect(formatTokenUnits("42", 0)).toBe("42");
	});
});
