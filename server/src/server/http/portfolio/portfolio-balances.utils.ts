import type { UserPortfolioSource } from "#services/portfolio/user-portfolio-sources/user-portfolio-sources.types";
import type { WalletBalancesResponse } from "#services/portfolio/wallet-balances/wallet-balances.types";

/** Adds saved source labels to wallet balance results without coupling balance clients to storage. */
export const addWalletSourceLabels = (
	response: WalletBalancesResponse,
	sources: UserPortfolioSource[],
): WalletBalancesResponse => {
	const labelsBySource = new Map(
		sources
			.filter((source) => source.label !== undefined)
			.map((source) => [createSourceKey(source.network, source.address), source.label]),
	);
	const labelsByAddress = new Map(
		sources
			.filter((source) => source.label !== undefined)
			.map((source) => [normalizeAddress(source.address), source.label]),
	);

	return {
		...response,
		balances: response.balances.map((balance) => {
			const label = labelsBySource.get(
				createSourceKey(balance.source.network, balance.source.address),
			);

			return label === undefined
				? balance
				: { ...balance, source: { ...balance.source, label } };
		}),
		errors: response.errors.map((error) => {
			const label = labelsByAddress.get(normalizeAddress(error.address));

			return label === undefined ? error : { ...error, label };
		}),
		sourceResults: response.sourceResults.map((result) => {
			const label = labelsBySource.get(
				createSourceKey(result.network, result.address),
			);

			return label === undefined ? result : { ...result, label };
		}),
	};
};

const createSourceKey = (network: string, address: string): string =>
	`${network}:${normalizeAddress(address)}`;

const normalizeAddress = (address: string): string => address.trim().toLowerCase();
