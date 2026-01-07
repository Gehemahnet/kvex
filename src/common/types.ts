export type Exchange = "PARADEX" | "PACIFICA" | "ETHEREAL";
export type LowercaseExchange = Lowercase<Exchange>;
export type Side = "BUY" | "SELL";

export interface OrderbookLevel {
	price: string;
	size: string;
}

export interface Orderbook {
	market: string;
	bids: OrderbookLevel[]; // sorted desc
	asks: OrderbookLevel[]; // sorted asc
	seqNo?: number;
	lastUpdatedAt?: number;
	source: Exchange;
}

export interface NewOrder {
	market: string;
	side: Side;
	type: "LIMIT" | "MARKET";
	size: string;
	price?: string;
	clientOrderId?: string;
	tif?: "GTC" | "IOC" | "FOK";
}

export interface PlacedOrder {
	id: string;
	clientId?: string;
	status: string;
	filledSize?: string;
	remainingSize?: string;
	avgFillPrice?: string;
	source: Exchange;
}

export interface SnapshotResponse {
	bids: [string, string][];
	asks: [string, string][];
	seq_no?: number;
	last_updated_at?: number;
}
