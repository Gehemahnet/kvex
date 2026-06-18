import type { UserExchangeBalancesResponse } from "#services/portfolio/exchange-balances/exchange-balances.types";
import type { WalletBalancesResponse } from "#services/portfolio/wallet-balances/wallet-balances.types";

export type UserPortfolioBalancesResponse = {
	exchangeBalances: UserExchangeBalancesResponse;
	walletBalances: WalletBalancesResponse;
};
