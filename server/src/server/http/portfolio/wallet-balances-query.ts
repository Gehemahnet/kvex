import type {
	WalletBalanceNetwork,
	WalletBalancesQuery,
	WalletBalanceTokenInput,
} from "../../../services/portfolio/wallet-balances.types";
import {
	isEvmAddress,
	normalizeEvmAddress,
} from "../../../services/portfolio/evm-wallet-balances.utils";
import {
	isSolanaAddress,
	normalizeSolanaAddress,
} from "../../../services/portfolio/solana-wallet-balances.utils";
import {
	ALL_WALLET_TOKENS,
	DEFAULT_WALLET_BALANCE_NETWORK,
	NATIVE_WALLET_TOKEN,
} from "../../../services/portfolio/wallet-balances.constants";
import { BadRequestError } from "../http-errors";

/** Parses and validates `/portfolio/wallet-balances` query parameters. */
export const parseWalletBalancesQuery = (
	urlString: string | undefined,
): WalletBalancesQuery => {
	const url = new URL(urlString ?? "/", "http://localhost");
	const networks = parseWalletBalanceNetworks(url);
	const addressesByNetwork = Object.fromEntries(
		networks.map((network) => [
			network,
			parseWalletAddresses(url, network, networks.length === 1),
		]),
	) as Partial<Record<WalletBalanceNetwork, string[]>>;
	const addresses = networks.flatMap((network) => addressesByNetwork[network] ?? []);
	const tokens = parseWalletBalanceTokens(url, networks);
	const primaryAddress = addresses[0];
	const primaryNetwork = networks[0];

	if (!primaryAddress || !primaryNetwork) {
		throw new BadRequestError(
			"Query param `address` or `addresses` is required",
			"MISSING_WALLET_ADDRESS",
		);
	}

	return {
		address: primaryAddress,
		addresses,
		addressesByNetwork,
		network: primaryNetwork,
		networks,
		tokens,
	};
};

const parseWalletBalanceNetworks = (url: URL): WalletBalanceNetwork[] => {
	const rawValue = url.searchParams.get("networks") ?? url.searchParams.get("network");
	const value = rawValue?.trim().toLowerCase();

	if (!value) {
		return [DEFAULT_WALLET_BALANCE_NETWORK];
	}

	const networks = value
		.split(",")
		.map((network) => network.trim())
		.filter(Boolean)
		.map(parseWalletBalanceNetwork);

	return [...new Set(networks.length ? networks : [DEFAULT_WALLET_BALANCE_NETWORK])];
};

const parseWalletBalanceNetwork = (value: string): WalletBalanceNetwork => {
	if (value === "evm" || value === "solana") {
		return value;
	}

	throw new BadRequestError(
		"Query param `network` or `networks` must contain only `evm` or `solana`",
		"UNSUPPORTED_WALLET_BALANCE_NETWORK",
	);
};

const parseWalletAddress = (
	value: string | undefined,
	network: WalletBalanceNetwork,
): string => {
	const normalizedValue = value?.trim();

	if (!normalizedValue) {
		throw new BadRequestError(
			"Query param `address` or `addresses` is required",
			"MISSING_WALLET_ADDRESS",
		);
	}

	if (network === "evm" && !isEvmAddress(normalizedValue)) {
		throw new BadRequestError(
			"Query param `address` must be an EVM address",
			"INVALID_WALLET_ADDRESS",
		);
	}

	if (network === "solana" && !isSolanaAddress(normalizedValue)) {
		throw new BadRequestError(
			"Query param `address` must be a Solana address",
			"INVALID_WALLET_ADDRESS",
		);
	}

	return network === "evm"
		? normalizeEvmAddress(normalizedValue)
		: normalizeSolanaAddress(normalizedValue);
};

const parseWalletAddresses = (
	url: URL,
	network: WalletBalanceNetwork,
	allowGenericAddresses: boolean,
): string[] => {
	const addressValues = [
		url.searchParams.get(`${network}Addresses`),
		url.searchParams.get(`${network}Address`),
		...(allowGenericAddresses
			? [url.searchParams.get("addresses"), url.searchParams.get("address")]
			: []),
	]
		.filter((value): value is string => value !== null)
		.flatMap((value) => value.split(","))
		.map((value) => parseWalletAddress(value, network));

	if (addressValues.length === 0) {
		throw new BadRequestError(
			"Query param `address` or `addresses` is required",
			"MISSING_WALLET_ADDRESS",
		);
	}

	return [...new Set(addressValues)];
};

const parseWalletBalanceTokens = (
	url: URL,
	networks: WalletBalanceNetwork[],
): WalletBalanceTokenInput[] => {
	const value = url.searchParams.get("tokens")?.trim();

	if (!value) {
		return [NATIVE_WALLET_TOKEN];
	}

	const tokens = value
		.split(",")
		.map((token) => token.trim())
		.filter(Boolean)
		.map((token) => parseWalletBalanceToken(token, networks));

	return [...new Set(tokens.length ? tokens : [NATIVE_WALLET_TOKEN])];
};

const parseWalletBalanceToken = (
	token: string,
	networks: WalletBalanceNetwork[],
): WalletBalanceTokenInput => {
	if (token.toLowerCase() === NATIVE_WALLET_TOKEN) {
		return NATIVE_WALLET_TOKEN;
	}

	if (token.toLowerCase() === ALL_WALLET_TOKENS) {
		return ALL_WALLET_TOKENS;
	}

	if (networks.includes("solana")) {
		throw new BadRequestError(
			"Query param `tokens` must contain only `native` or `all` for Solana",
			"INVALID_WALLET_BALANCE_TOKEN",
		);
	}

	if (networks.includes("evm") && isEvmAddress(token)) {
		return normalizeEvmAddress(token);
	}

	throw new BadRequestError(
		"Query param `tokens` must contain `all`, `native`, or EVM token addresses",
		"INVALID_WALLET_BALANCE_TOKEN",
	);
};
