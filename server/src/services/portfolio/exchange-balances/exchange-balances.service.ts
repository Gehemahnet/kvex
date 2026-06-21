import { etherealRestClient } from "#exchanges/ethereal/ethereal";
import { hyperliquidRestClient } from "#exchanges/hyperliquid/hyperliquid";
import { nadoClient } from "#exchanges/nado/nado";
import { okxClient } from "#exchanges/okx/okx";
import type {
	OkxAccountBalance,
	OkxTradeFee,
} from "#exchanges/okx/okx.types";
import type {
	UserExchangeAccount,
	UserExchangeFeeProfile,
} from "#services/users/user-exchange-accounts/user-exchange-accounts.types";
import type {
	UserExchangeBalanceAsset,
	UserExchangeBalanceErrorCode,
	UserExchangeBalanceError,
	UserExchangeBalanceResult,
	UserExchangeBalancesResponse,
} from "./exchange-balances.types";
import { EXCHANGE_FEE_PROFILE_TTL_MS } from "./exchange-balances.constants";

type UserExchangeBalanceSuccess = {
	balance: UserExchangeBalanceResult;
	feeProfiles?: UserExchangeFeeProfile[];
};

type UserExchangeBalancesOptions = {
	onAccountChecked?: (
		account: UserExchangeAccount,
		balance: UserExchangeBalanceResult,
	) => Promise<void> | void;
	onAccountFailed?: (
		account: UserExchangeAccount,
		error: UserExchangeBalanceError,
	) => Promise<void> | void;
	onFeeProfiles?: (
		account: UserExchangeAccount,
		feeProfiles: UserExchangeFeeProfile[],
	) => Promise<void> | void;
};

/** Reads normalized balances for active user exchange accounts. */
export const getUserExchangeBalances = async (
	accounts: UserExchangeAccount[],
	options: UserExchangeBalancesOptions = {},
): Promise<UserExchangeBalancesResponse> => {
	const activeAccounts = accounts.filter((account) =>
		account.status !== "disabled" && account.capabilities.balances !== false
	);
	const settledResults = await Promise.all(
		activeAccounts.map((account) => getUserExchangeBalance(account, options)),
	);

	return settledResults.reduce<UserExchangeBalancesResponse>(
		(result, item) => {
			if ("error" in item) {
				result.errors.push(item.error);
			} else {
				result.balances.push(item.balance);
			}

			return result;
		},
		{ balances: [], errors: [] },
	);
};

const getUserExchangeBalance = async (
	account: UserExchangeAccount,
	options: UserExchangeBalancesOptions,
): Promise<
	| UserExchangeBalanceSuccess
	| { error: UserExchangeBalanceError }
> => {
	try {
		assertExchangeAccountTokenIsUsable(account);

		let result: UserExchangeBalanceSuccess;

		if (account.exchange === "ethereal") {
			result = { balance: await getEtherealUserExchangeBalance(account) };
		} else if (account.exchange === "hyperliquid") {
			result = await getHyperliquidUserExchangeBalance(account);
		} else if (account.exchange === "nado") {
			result = { balance: await getNadoUserExchangeBalance(account) };
		} else if (account.exchange === "okx") {
			result = await getOkxUserExchangeBalance(account);
		} else if (account.exchange === "pacifica") {
			result = { balance: await getPacificaUserExchangeBalance(account) };
		} else {
			throw new ExchangeBalanceError(
				"EXCHANGE_BALANCE_UNSUPPORTED",
				`Exchange ${account.exchange} balance reads are not supported yet`,
			);
		}

		await callOptionalSideEffect(() =>
			options.onAccountChecked?.(account, result.balance)
		);
		if (result.feeProfiles !== undefined) {
			await callOptionalSideEffect(() =>
				options.onFeeProfiles?.(account, result.feeProfiles ?? [])
			);
		}

		return result;
	} catch (error) {
		const exchangeError: UserExchangeBalanceError = {
			accountId: account.id,
			exchange: account.exchange,
			code: getExchangeBalanceErrorCode(error),
			label: account.label,
			message: getExchangeBalanceErrorMessage(error),
		};

		await callOptionalSideEffect(() =>
			options.onAccountFailed?.(account, exchangeError)
		);

		return { error: exchangeError };
	}
};

class ExchangeBalanceError extends Error {
	constructor(
		readonly code: UserExchangeBalanceErrorCode,
		message: string,
	) {
		super(message);
		this.name = "ExchangeBalanceError";
	}
}

const getExchangeBalanceErrorCode = (
	error: unknown,
): UserExchangeBalanceErrorCode =>
	error instanceof ExchangeBalanceError
		? error.code
		: "EXCHANGE_BALANCE_FETCH_FAILED";

const getExchangeBalanceErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : "Unable to fetch exchange balance";

const assertExchangeAccountTokenIsUsable = (
	account: UserExchangeAccount,
): void => {
	const expiresAt = account.publicData.expiresAt;

	if (expiresAt === undefined) {
		return;
	}

	const expiryTime = new Date(expiresAt).getTime();

	if (!Number.isFinite(expiryTime)) {
		throw new ExchangeBalanceError(
			"EXCHANGE_TOKEN_EXPIRY_INVALID",
			"Exchange token expiry is invalid",
		);
	}

	if (expiryTime <= Date.now()) {
		throw new ExchangeBalanceError(
			"EXCHANGE_TOKEN_EXPIRED",
			"Exchange token is expired",
		);
	}
};

const getHyperliquidUserExchangeBalance = async (
	account: UserExchangeAccount,
): Promise<UserExchangeBalanceSuccess> => {
	const data = account.publicData.exchange === "hyperliquid"
		? account.publicData
		: undefined;
	const address = data?.address?.trim();

	if (!address) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			"Hyperliquid account address is required",
		);
	}

	const [perpState, spotState, fees] = await Promise.all([
		hyperliquidRestClient.getClearinghouseState(address),
		hyperliquidRestClient.getSpotClearinghouseState(address),
		refreshUserExchangeFeeProfiles(account),
	]);
	const assets: UserExchangeBalanceAsset[] = [];
	const accountValue = parseOptionalNumber(perpState.marginSummary?.accountValue);

	if (perpState.marginSummary?.accountValue !== undefined) {
		assets.push({
			asset: "USDC",
			equity: perpState.marginSummary.accountValue,
			...(perpState.marginSummary.totalRawUsd === undefined
				? {}
				: { total: perpState.marginSummary.totalRawUsd }),
			...(perpState.withdrawable === undefined
				? {}
				: { available: perpState.withdrawable }),
			...(accountValue === undefined ? {} : { valueUsd: accountValue }),
		});
	}

	for (const balance of spotState.balances ?? []) {
		assets.push({
			asset: balance.coin,
			total: balance.total,
			...(balance.hold === undefined ? {} : { hold: balance.hold }),
		});
	}

	return {
		balance: {
			accountId: account.id,
			exchange: "hyperliquid",
			label: account.label,
			assets,
			...(accountValue === undefined ? {} : { totalValueUsd: accountValue }),
			...(perpState.time === undefined
				? {}
				: { updatedAt: new Date(perpState.time).toISOString() }),
		},
		...(fees === undefined ? {} : { feeProfiles: fees }),
	};
};

const getEtherealUserExchangeBalance = async (
	account: UserExchangeAccount,
): Promise<UserExchangeBalanceResult> => {
	const data = account.publicData.exchange === "ethereal"
		? account.publicData
		: undefined;
	const address = data?.address?.trim();

	if (!address) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			"Ethereal wallet address is required",
		);
	}

	const subaccount = await etherealRestClient.resolveSubaccount(
		address,
		data?.subaccountName?.trim() || "primary",
	);

	if (!subaccount) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			"Ethereal subaccount was not found for this wallet",
		);
	}

	const balances = await etherealRestClient.getSubaccountBalances(subaccount.id);
	const assets = balances.map<UserExchangeBalanceAsset>((balance) => {
		const value = Number.parseFloat(balance.amount);

		return {
			asset: balance.tokenName,
			available: balance.available,
			equity: balance.amount,
			hold: balance.totalUsed,
			total: balance.amount,
			...(Number.isFinite(value) && /^(USD|USDE)$/iu.test(balance.tokenName)
				? { valueUsd: value }
				: {}),
		};
	});
	const totalValueUsd = assets.reduce(
		(total, asset) => total + (asset.valueUsd ?? 0),
		0,
	);

	return {
		accountId: account.id,
		exchange: "ethereal",
		label: account.label,
		assets,
		...(assets.some((asset) => asset.valueUsd !== undefined) ? { totalValueUsd } : {}),
		...(balances.length
			? { updatedAt: new Date(Math.max(...balances.map((balance) => balance.updatedAt))).toISOString() }
			: {}),
	};
};

const mapHyperliquidUserFees = (
	fees: { userAddRate: string; userCrossRate: string },
): UserExchangeFeeProfile[] => {
	const makerFeeRate = parseOptionalNumber(fees.userAddRate);
	const takerFeeRate = parseOptionalNumber(fees.userCrossRate);

	if (makerFeeRate === undefined || takerFeeRate === undefined) {
		return [];
	}

	return [{
		expiresAt: new Date(Date.now() + EXCHANGE_FEE_PROFILE_TTL_MS).toISOString(),
		instrumentType: "PERP",
		makerFeeRate,
		marketType: "perp",
		source: "api",
		takerFeeRate,
	}];
};

const getNadoUserExchangeBalance = async (
	account: UserExchangeAccount,
): Promise<UserExchangeBalanceResult> => {
	const data = account.publicData.exchange === "nado" ? account.publicData : undefined;
	const address = data?.address?.trim();
	const subaccountName = data?.subaccountName?.trim() || "default";

	if (!address) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			"Nado owner wallet address is required",
		);
	}

	const summary = await nadoClient.getSubaccountSummary({
		subaccountName,
		subaccountOwner: address,
	});

	if (!summary.exists) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			`Nado subaccount "${subaccountName}" was not found for this wallet`,
		);
	}

	const assets = summary.balances
		.filter((balance) => parseOptionalNumber(balance.amount) !== 0)
		.map((balance) => ({
			asset: balance.symbol ?? `NADO-${balance.type}-${balance.productId}`,
			...(balance.vQuoteBalance === undefined ? {} : { equity: balance.vQuoteBalance }),
			total: balance.amount,
			...(balance.valueUsd === undefined ? {} : { valueUsd: balance.valueUsd }),
		}));

	return {
		accountId: account.id,
		exchange: "nado",
		label: account.label,
		assets,
		totalValueUsd: assets.reduce((total, asset) => total + (asset.valueUsd ?? 0), 0),
		updatedAt: new Date().toISOString(),
	};
};

const getOkxUserExchangeBalance = async (
	account: UserExchangeAccount,
): Promise<UserExchangeBalanceSuccess> => {
	const data = account.publicData.exchange === "okx" ? account.publicData : undefined;
	const apiKey = data?.apiKey?.trim();
	const apiSecret = data?.apiSecret?.trim();
	const passphrase = data?.passphrase?.trim();

	if (!apiKey || !apiSecret || !passphrase) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			"OKX apiKey, apiSecret, and passphrase are required",
		);
	}

	const credentials = { apiKey, apiSecret, passphrase };
	const [balances, fees] = await Promise.all([
		okxClient.getAccountBalance(credentials),
		refreshUserExchangeFeeProfiles(account),
	]);
	const [accountBalance] = balances;

	return {
		balance: mapOkxAccountBalance(account, accountBalance),
		...(fees === undefined ? {} : { feeProfiles: fees }),
	};
};

const mapOkxAccountBalance = (
	account: UserExchangeAccount,
	balance: OkxAccountBalance | undefined,
): UserExchangeBalanceResult => ({
	accountId: account.id,
	exchange: "okx",
	label: account.label,
	assets: (balance?.details ?? [])
		.filter((detail) =>
			parseOptionalNumber(detail.eq ?? detail.cashBal ?? detail.availBal) !== 0
		)
		.map((detail) => ({
			asset: detail.ccy,
			...(detail.availBal ?? detail.availEq
				? { available: detail.availBal ?? detail.availEq }
				: {}),
			...(detail.eq === undefined ? {} : { equity: detail.eq }),
			...(detail.cashBal === undefined ? {} : { total: detail.cashBal }),
			...(parseOptionalNumber(detail.eqUsd) === undefined
				? {}
				: { valueUsd: parseOptionalNumber(detail.eqUsd) }),
		})),
	...(parseOptionalNumber(balance?.totalEq) === undefined
		? {}
		: { totalValueUsd: parseOptionalNumber(balance?.totalEq) }),
	...(balance?.uTime === undefined
		? {}
		: { updatedAt: new Date(Number(balance.uTime)).toISOString() }),
});

const mapOkxTradeFees = (
	fees: OkxTradeFee[],
): UserExchangeFeeProfile[] =>
	fees.flatMap((fee) => {
		const makerFeeRate = parseOptionalNumber(fee.maker);
		const takerFeeRate = parseOptionalNumber(fee.taker);
		if (makerFeeRate === undefined || takerFeeRate === undefined) {
			return [];
		}

		return [{
			makerFeeRate,
			takerFeeRate,
			source: "api",
			instrumentType: fee.instType ?? "SWAP",
			marketType: "perp",
			...(fee.level === undefined ? {} : { tierLabel: fee.level }),
			expiresAt: new Date(Date.now() + EXCHANGE_FEE_PROFILE_TTL_MS).toISOString(),
		}];
	});

/** Refreshes an expired account-specific fee profile without affecting balance reads. */
export const refreshUserExchangeFeeProfiles = async (
	account: UserExchangeAccount,
): Promise<UserExchangeFeeProfile[] | undefined> => {
	if (!shouldRefreshFeeProfiles(account)) {
		return undefined;
	}

	try {
		if (account.publicData.exchange === "hyperliquid") {
			const address = account.publicData.address?.trim();

			return address
				? mapHyperliquidUserFees(await hyperliquidRestClient.getUserFees(address))
				: undefined;
		}

		if (account.publicData.exchange === "okx") {
			const { apiKey, apiSecret, passphrase } = account.publicData;

			if (!apiKey?.trim() || !apiSecret?.trim() || !passphrase?.trim()) {
				return undefined;
			}

			return mapOkxTradeFees(await okxClient.getTradeFee(
				{ apiKey: apiKey.trim(), apiSecret: apiSecret.trim(), passphrase: passphrase.trim() },
				{ instType: "SWAP" },
			));
		}
	} catch {
		return undefined;
	}

	return undefined;
};

const shouldRefreshFeeProfiles = (
	account: UserExchangeAccount,
	now: number = Date.now(),
): boolean =>
	!(account.publicData.feeProfiles ?? []).some((profile) =>
		profile.source === "api" &&
		profile.marketType === "perp" &&
		profile.expiresAt !== undefined &&
		new Date(profile.expiresAt).getTime() > now
	);

const getPacificaUserExchangeBalance = async (
	account: UserExchangeAccount,
): Promise<UserExchangeBalanceResult> => {
	const data = account.publicData.exchange === "pacifica"
		? account.publicData
		: undefined;

	if (!data?.accountAddress && !data?.apiKey) {
		throw new ExchangeBalanceError(
			"EXCHANGE_BALANCE_CREDENTIALS_REQUIRED",
			"Pacifica account address or read-only API credentials are required",
		);
	}

	throw new ExchangeBalanceError(
		"EXCHANGE_BALANCE_UNSUPPORTED",
		"Pacifica balance endpoint is not wired yet; official API spec confirmation is required",
	);
};

const parseOptionalNumber = (value: string | undefined): number | undefined => {
	if (value === undefined) {
		return undefined;
	}

	const parsed = Number.parseFloat(value);

	return Number.isFinite(parsed) ? parsed : undefined;
};

const callOptionalSideEffect = async (
	callback: () => Promise<void> | void | undefined,
): Promise<void> => {
	try {
		await callback();
	} catch {
		// Balance reads should stay best-effort even if metadata refresh fails.
	}
};
