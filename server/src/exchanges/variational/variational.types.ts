export type VariationalStatsResponse = {
	total_volume_24h?: string;
	cumulative_volume?: string;
	tvl?: string;
	open_interest?: string;
	num_markets?: number;
	listings?: VariationalListing[];
};

export type VariationalListing = {
	ticker: string;
	name?: string;
	mark_price?: string;
	volume_24h?: string;
	open_interest?: {
		long_open_interest?: string;
		short_open_interest?: string;
	};
	funding_rate?: string;
	funding_interval_s?: number;
	base_spread_bps?: string;
	quotes?: {
		updated_at?: string;
		size_1k?: VariationalQuote;
		size_100k?: VariationalQuote;
		size_1m?: VariationalQuote;
	};
};

export type VariationalQuote = {
	bid?: string;
	ask?: string;
};
