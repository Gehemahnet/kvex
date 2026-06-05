export type PacificaWsSubscriptionMessage = {
	method: "subscribe" | "unsubscribe";
	params: {
		source: "prices" | "book";
		symbol?: string;
		agg_level?: number;
	};
};

export type PacificaWsPingMessage = {
	method: "ping";
};

export type PacificaPriceData = {
	funding?: string;
	mark?: string;
	mid?: string;
	next_funding?: string;
	open_interest?: string;
	oracle?: string;
	symbol: string;
	timestamp?: number;
	volume_24h?: string;
	yesterday_price?: string;
};

export type PacificaPricesMessage = {
	channel: "prices";
	data: PacificaPriceData[];
};

export type PacificaBookLevel = {
	p: string;
	a: string;
	n: number;
};

export type PacificaBookData = {
	s: string;
	l: [bids: PacificaBookLevel[], asks: PacificaBookLevel[]];
	t?: number;
	li?: number;
};

export type PacificaBookMessage = {
	channel: "book";
	data: PacificaBookData;
};
