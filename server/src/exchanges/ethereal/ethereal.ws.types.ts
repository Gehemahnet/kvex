export type EtherealWsSubscriptionMessage = {
	event: "subscribe" | "unsubscribe";
	data: {
		type: "Ticker" | "L2Book";
		symbol: string;
	};
};

export type EtherealAccountWsSubscriptionMessage = {
	event: "subscribe" | "unsubscribe";
	data: {
		type: "PositionUpdate" | "OrderFill";
		subaccountId: string;
	};
};

export type EtherealPositionUpdateMessage = {
	e: "PositionUpdate";
	t: number;
	data: {
		t: number;
		d: Array<{
			cost: string;
			fee: string;
			fpnl: string;
			id: string;
			lpx?: string;
			rpnl: string;
			s: string;
			sd: 0 | 1;
			sid: string;
			sz: string;
		}>;
	};
};

export type EtherealOrderFillMessage = {
	e: "OrderFill";
	t: number;
	data: {
		t: number;
		d: Array<{
			fee: string;
			id: string;
			px: string;
			ro: boolean;
			s: string;
			sd: 0 | 1;
			sid: string;
			sz: string;
			t: number;
			typ: "LIMIT" | "MARKET";
		}>;
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
