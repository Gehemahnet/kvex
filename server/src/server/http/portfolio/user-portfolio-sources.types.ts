import type {
	UserPortfolioSourceStatus,
} from "#services/portfolio/user-portfolio-sources/user-portfolio-sources.types";
import type { WalletBalanceNetwork } from "#services/portfolio/wallet-balances/wallet-balances.types";

export type CreateUserPortfolioSourceBody = {
	address?: unknown;
	label?: unknown;
	network?: unknown;
};

export type CreateUserPortfolioSourcesBody = {
	sources?: unknown;
};

export type UpdateUserPortfolioSourceBody = {
	label?: unknown;
	status?: unknown;
};

export type ParsedCreateUserPortfolioSourceBody = {
	address: string;
	label?: string;
	network: WalletBalanceNetwork;
};

export type ParsedUpdateUserPortfolioSourceBody = {
	label?: string;
	status?: UserPortfolioSourceStatus;
};
