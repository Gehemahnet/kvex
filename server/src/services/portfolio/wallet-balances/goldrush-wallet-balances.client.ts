import {
	GoldRushClient,
	type ChainID,
	type MultiChainBalanceItem,
} from "@covalenthq/client-sdk";
import { DEFAULT_CURRENCY } from "#common/constants";
import type { GoldRushTokenBalanceItem } from "#services/portfolio/wallet-balances/wallet-balances.types";

export type GoldRushTokenBalancesParams = {
	address: string;
	chainIds: number[];
};

/** Portfolio indexer contract used for indexed multichain token discovery. */
export type PortfolioBalanceIndexer = {
	getTokenBalances(params: GoldRushTokenBalancesParams): Promise<GoldRushTokenBalanceItem[]>;
};

/** GoldRush SDK adapter for portfolio token balance discovery. */
export class GoldRushPortfolioBalanceIndexer implements PortfolioBalanceIndexer {
	private readonly client: GoldRushClient;

	constructor(apiKey: string) {
		this.client = new GoldRushClient(apiKey, {
			enableRetry: true,
			maxRetries: 1,
			threadCount: 2,
		});
	}

	async getTokenBalances({
		address,
		chainIds,
	}: GoldRushTokenBalancesParams): Promise<GoldRushTokenBalanceItem[]> {
		const response = await this.client.AllChainsService.getMultiChainBalances(
			address,
			{
				chains: chainIds as ChainID[],
				limit: 1000,
				quoteCurrency: DEFAULT_CURRENCY,
			},
		);

		if (response.error) {
			throw new Error(
				response.error_message || `GoldRush SDK error ${response.error_code}`,
			);
		}

		return (response.data?.items ?? []).map(mapGoldRushSdkBalanceItem);
	}
}

const mapGoldRushSdkBalanceItem = (
	item: MultiChainBalanceItem,
): GoldRushTokenBalanceItem => ({
	balance: item.balance?.toString(),
	chain_id: Number(item.chain_id),
	chain_name: nullableToUndefined(item.chain_name)?.toString(),
	contract_address: nullableToUndefined(item.contract_address),
	contract_decimals: item.contract_decimals,
	contract_display_name: nullableToUndefined(item.contract_display_name),
	contract_name: nullableToUndefined(item.contract_name),
	contract_ticker_symbol: nullableToUndefined(item.contract_ticker_symbol),
	is_native_token: nullableToUndefined(item.is_native_token),
	is_spam: nullableToUndefined(item.is_spam),
	logo_urls: nullableToUndefined(item.logo_urls),
	quote: item.quote,
	quote_rate: item.quote_rate,
});

const nullableToUndefined = <T>(value: T | null | undefined): T | undefined =>
	value ?? undefined;
