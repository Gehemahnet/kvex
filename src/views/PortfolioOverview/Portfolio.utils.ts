import type {
	AssetPrice,
	UserExchangeBalanceResult,
	UserExchangeToken,
	WalletBalanceNetwork,
	WalletBalanceTokenInput,
	WalletTokenBalance,
} from "@api/portfolio";
import type {
	PortfolioAssetRow,
	PortfolioExchangeTokenRow,
} from "./Portfolio.types";
import { DEFAULT_CURRENCY } from "@shared/constants/currencies";
import {
	isEvmAddress,
	isSolanaAddress,
} from "@shared/utils/validation";

const TRUSTED_PRICE_SYMBOLS = new Set([
	"AAVE",
	"BTC",
	"DAI",
	"ETH",
	"HYPE",
	"LINK",
	"MATIC",
	"ONDO",
	"PENDLE",
	"SOL",
	"UNI",
	"USDC",
	"USDE",
	"USDT",
	"WBTC",
	"WETH",
	"WMATIC",
]);

/** Splits a comma or newline separated wallet list into normalized EVM addresses. */
export const parseWalletAddressesInput = (value: string): string[] =>
	[
		...new Set(
			value
				.split(/[,\n]/)
				.map((address) => address.trim().toLowerCase())
				.filter(address => address && isEvmAddress(address))
		),
	];

/** Splits a comma or newline separated wallet list into normalized Solana addresses. */
export const parseSolanaWalletAddressesInput = (value: string): string[] =>
	[
		...new Set(
			value
				.split(/[,\n]/)
				.map((address) => address.trim())
				.filter(address => address && isSolanaAddress(address))
		),
	];

/** Shortens long token or wallet identifiers for dense portfolio UI. */
export const shortenAddress = (value: string): string =>
	value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

/** Converts wallet balance rows into table-friendly portfolio asset rows. */
export const createPortfolioAssetRows = (
	balances: WalletTokenBalance[],
	prices: AssetPrice[] = [],
): PortfolioAssetRow[] =>
	balances
		.map((balance) => {
			const symbol = balance.symbol ?? getTokenDisplayName(balance.token);
			const name = getTokenDisplayName(balance.token);
			const price = prices.find((item) => item.symbol === symbol.toUpperCase());
			const amount = Number.parseFloat(balance.formattedBalance);
			const priceUsd = balance.priceUsd ?? price?.priceUsd;
			const valueUsd = balance.valueUsd ??
				(priceUsd && Number.isFinite(amount) ? amount * priceUsd : undefined);

			return {
				id: createPortfolioAssetRowId(balance),
				amount: formatPortfolioAssetAmount(balance.formattedBalance),
				chainName: balance.source.chainName ?? getWalletNetworkLabel(balance.source.network),
				...(balance.logoUrl ? { logoUrl: balance.logoUrl } : {}),
				name,
				...(priceUsd ? { priceUsd } : {}),
				sourceLabel: balance.source.label ?? formatPortfolioSource(balance.source.address),
				sourceNetwork: balance.source.network,
				sourceType: "Wallet",
				symbol,
				token: balance.token,
				...(valueUsd !== undefined ? { valueUsd } : {}),
			};
		})
		.filter((row) => row.valueUsd !== undefined && row.valueUsd > 0)
		.sort((left, right) => (right.valueUsd ?? 0) - (left.valueUsd ?? 0));

/** Converts exchange account balances into table-friendly portfolio asset rows. */
export const createExchangeAssetRows = (
	balances: UserExchangeBalanceResult[],
): PortfolioAssetRow[] =>
	balances
		.flatMap((balance) =>
			balance.assets.map((asset) => ({
				id: [
					"exchange",
					balance.exchange,
					balance.accountId,
					asset.asset,
				].join("-"),
				amount: formatPortfolioAssetAmount(
					asset.equity ?? asset.total ?? asset.available ?? "0",
				),
				chainName: getExchangeLabel(balance.exchange),
				name: asset.asset,
				sourceLabel: balance.label,
				sourceNetwork: "exchange" as const,
				sourceType: "Exchange",
				symbol: asset.asset,
				token: asset.asset,
				...(asset.valueUsd === undefined ? {} : { valueUsd: asset.valueUsd }),
			})),
		)
		.filter((row) => row.valueUsd !== undefined && row.valueUsd > 0)
		.sort((left, right) => (right.valueUsd ?? 0) - (left.valueUsd ?? 0));

/** Converts saved exchange tokens into table-friendly rows. */
export const createPortfolioExchangeTokenRows = (
	tokens: UserExchangeToken[],
): PortfolioExchangeTokenRow[] =>
	tokens.map((token) => ({
		id: token.id,
		exchange: token.exchange,
		exchangeLabel: getExchangeLabel(token.exchange),
		expiresInLabel: formatExpiresIn(token.publicData.expiresAt),
		freshnessLabel: formatFreshness(token.lastCheckedAt),
		label: token.label,
		permissions: token.publicData.permissions ?? [],
		status: token.status,
		valueUsdLabel: "-",
	}));

const createPortfolioAssetRowId = (balance: WalletTokenBalance): string =>
	[
		balance.source.type,
		balance.source.network,
		balance.source.chainKey ?? "default",
		balance.source.address,
		balance.token,
	].join("-");

/** Returns unique asset symbols that can be used for USD price lookup. */
export const getPortfolioPriceSymbols = (
	balances: WalletTokenBalance[],
): string[] =>
	[
		...new Set(
			balances
				.filter((balance) => balance.priceUsd === undefined)
				.map((balance) => balance.symbol)
				.filter((symbol): symbol is string => typeof symbol === "string")
				.map((symbol) => symbol.trim().toUpperCase())
				.filter((symbol) => TRUSTED_PRICE_SYMBOLS.has(symbol)),
		),
	];

/** Sums known USD row values while ignoring assets without a connected price. */
export const getTotalPortfolioValueUsd = (rows: PortfolioAssetRow[]): number =>
	rows.reduce((total, row) => total + (row.valueUsd ?? 0), 0);

/** Formats USD values for compact portfolio display. */
export const formatUsdValue = (value: number): string =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: DEFAULT_CURRENCY,
		maximumFractionDigits: value >= 1 ? 2 : 4,
	}).format(value);

/** Formats a portfolio source label for table display. */
export const formatPortfolioSource = (address: string): string =>
	shortenAddress(address);

/** Formats token amounts with enough precision for tiny non-zero balances. */
export const formatPortfolioAssetAmount = (value: string): string => {
	const normalizedValue = value.trim();

	if (!normalizedValue.includes(".")) {
		return normalizedValue;
	}

	const [integerPart = "0", fractionalPart = ""] = normalizedValue.split(".");
	const firstNonZeroIndex = fractionalPart.search(/[1-9]/);

	if (firstNonZeroIndex === -1) {
		return integerPart;
	}

	const decimals = integerPart === "0"
		? Math.max(4, firstNonZeroIndex + 1)
		: 4;
	const formattedFraction = fractionalPart
		.slice(0, decimals)
		.replace(/0+$/, "");

	return formattedFraction ? `${integerPart}.${formattedFraction}` : integerPart;
};

/** Returns a display name for native tokens and token addresses. */
export const getTokenDisplayName = (token: WalletBalanceTokenInput): string =>
	token === "native" ? "Native" : shortenAddress(token);

/** Returns a human-readable network label for portfolio rows. */
export const getWalletNetworkLabel = (network: WalletBalanceNetwork): string =>
	network === "evm" ? "EVM" : "Solana";

/** Returns a human-readable exchange label for portfolio rows. */
export const getExchangeLabel = (exchange: string): string => {
	const labels: Record<string, string> = {
		ethereal: "Ethereal",
		hyperliquid: "Hyperliquid",
		nado: "Nado",
		okx: "OKX",
		pacifica: "Pacifica",
		variational: "Variational",
	};

	return labels[exchange] ?? exchange;
};

/** Formats token freshness from the last successful backend check timestamp. */
export const formatFreshness = (checkedAt?: string): string => {
	if (!checkedAt) {
		return "Never checked";
	}

	return `${formatDuration(Date.now() - new Date(checkedAt).getTime())} ago`;
};

/** Formats how long an exchange token has before user-provided expiration. */
export const formatExpiresIn = (expiresAt?: string): string => {
	if (!expiresAt) {
		return "Not set";
	}

	const diffMs = new Date(expiresAt).getTime() - Date.now();

	if (diffMs <= 0) {
		return "Expired";
	}

	return `${formatDuration(diffMs)} left`;
};

const formatDuration = (durationMs: number): string => {
	const minutes = Math.max(1, Math.floor(durationMs / 60_000));

	if (minutes < 60) {
		return `${minutes}m`;
	}

	const hours = Math.floor(minutes / 60);

	if (hours < 48) {
		return `${hours}h`;
	}

	return `${Math.floor(hours / 24)}d`;
};
