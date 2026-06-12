const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const BALANCE_OF_SELECTOR = "70a08231";

/** Returns true when a value is a hex-encoded EVM address. */
export const isEvmAddress = (value: string): boolean =>
	EVM_ADDRESS_PATTERN.test(value);

/** Normalizes an EVM address for request de-duplication and comparisons. */
export const normalizeEvmAddress = (value: string): string =>
	value.trim().toLowerCase();

/** Encodes an ERC-20 `balanceOf(address)` call. */
export const encodeErc20BalanceOfCall = (address: string): string =>
	`0x${BALANCE_OF_SELECTOR}${normalizeEvmAddress(address).slice(2).padStart(64, "0")}`;

/** Decodes a uint256 JSON-RPC hex value into a decimal string. */
export const decodeEvmUint256 = (value: string): string =>
	BigInt(normalizeHexQuantity(value)).toString();

/** Decodes an ERC-20 decimals response into a safe JavaScript number. */
export const decodeErc20Decimals = (value: string): number => {
	const decimals = Number(BigInt(normalizeHexQuantity(value)));

	return Number.isSafeInteger(decimals) && decimals >= 0 ? decimals : 0;
};

/** Decodes an ERC-20 symbol response from either string ABI or bytes32 ABI. */
export const decodeErc20Symbol = (value: string): string | undefined => {
	const normalizedValue = value.startsWith("0x") ? value.slice(2) : value;

	if (!normalizedValue) {
		return undefined;
	}

	const dynamicSymbol = decodeAbiString(normalizedValue);

	if (dynamicSymbol) {
		return dynamicSymbol;
	}

	return decodeBytes32String(normalizedValue.slice(0, 64));
};

/** Formats an integer token balance using token decimals without losing precision. */
export const formatTokenUnits = (
	rawBalance: string,
	decimals: number,
): string => {
	const value = BigInt(rawBalance);

	if (decimals <= 0) {
		return value.toString();
	}

	const base = 10n ** BigInt(decimals);
	const integerPart = value / base;
	const fractionalPart = value % base;

	if (fractionalPart === 0n) {
		return integerPart.toString();
	}

	return `${integerPart}.${fractionalPart.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
};

const normalizeHexQuantity = (value: string): string => {
	if (!value || value === "0x") {
		return "0x0";
	}

	return value;
};

const decodeAbiString = (value: string): string | undefined => {
	if (value.length < 128) {
		return undefined;
	}

	const offset = Number.parseInt(value.slice(0, 64), 16);

	if (offset !== 32) {
		return undefined;
	}

	const length = Number.parseInt(value.slice(64, 128), 16);
	const symbolHex = value.slice(128, 128 + length * 2);

	return decodeHexUtf8(symbolHex);
};

const decodeBytes32String = (value: string): string | undefined =>
	decodeHexUtf8(value.replace(/(00)+$/, ""));

const decodeHexUtf8 = (value: string): string | undefined => {
	if (!value) {
		return undefined;
	}

	try {
		return Buffer.from(value, "hex").toString("utf8").split("\u0000").join("").trim() ||
			undefined;
	} catch {
		return undefined;
	}
};
