export type EtherealWsSubscriptionMessage = {
	event: "subscribe" | "unsubscribe";
	data: {
		type: "Ticker" | "L2Book";
		symbol: string;
	};
};

export type EtherealTickerData = {
	s: string;
	t?: number;
	bidPx?: string;
	askPx?: string;
	bidAmt?: string;
	askAmt?: string;
	markPx?: string;
	markPx24h?: string;
	oi?: string;
	fr1h?: string;
	vol24h?: string;
};

export type EtherealTickerMessage = {
	e: "Ticker";
	t: number;
	data: EtherealTickerData;
};

export type EtherealL2BookData = {
	s: string;
	t?: number;
	pt?: number;
	a: [string, string][];
	b: [string, string][];
};

export type EtherealL2BookMessage = {
	e: "L2Book";
	t: number;
	data: EtherealL2BookData;
};
