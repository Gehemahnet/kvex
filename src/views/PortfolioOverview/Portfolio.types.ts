import type {
	UserExchangePermission,
	UserExchangeTokenExchange,
	WalletBalanceNetwork,
	WalletBalanceTokenInput,
} from "@api/portfolio";

export type PortfolioAssetRow = {
	id: string;
	amount: string;
	chainName: string;
	logoUrl?: string;
	name: string;
	priceUsd?: number;
	priceChangePercent?: number;
	sourceLabel: string;
	sourceNetwork: WalletBalanceNetwork | "exchange";
	sourceType: string;
	symbol: string;
	token: WalletBalanceTokenInput;
	valueUsd?: number;
};

export type PortfolioWalletSourceRow = {
	id: string;
	address: string;
	label?: string;
	network: WalletBalanceNetwork;
	sourceLabel: string;
	status: "active" | "disabled";
	valueUsd?: number;
	valueUsdLabel: string;
};

export type PortfolioExchangeTokenRow = {
	id: string;
	exchange: UserExchangeTokenExchange;
	exchangeLabel: string;
	expiresInLabel: string;
	freshnessLabel: string;
	label: string;
	permissions: UserExchangePermission[];
	status: string;
	valueUsd?: number;
	valueUsdLabel: string;
};
