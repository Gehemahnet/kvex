export type NadoWsSubscriptionMessage = {
	method: "subscribe" | "unsubscribe";
	stream: NadoWsStreamSubscription;
	id?: number;
};

export type NadoWsStreamSubscription =
	| {
			type: "best_bid_offer";
			product_id: number;
	  }
	| {
			type: "funding_rate";
			product_id: number;
	  }
	| {
			type: "book_depth";
			product_id: number;
	  };

export type NadoBestBidOfferEvent = {
	type: "best_bid_offer";
	product_id: number;
	timestamp?: string;
	bid_price?: string;
	bid_qty?: string;
	ask_price?: string;
	ask_qty?: string;
};

export type NadoFundingRateEvent = {
	type: "funding_rate";
	product_id: number;
	timestamp?: string;
	funding_rate_x18?: string;
	update_time?: string;
};

export type NadoBookDepthEvent = {
	type: "book_depth";
	product_id: number;
	min_timestamp?: string;
	max_timestamp?: string;
	last_max_timestamp?: string;
	bids: [priceX18: string, sizeX18: string][];
	asks: [priceX18: string, sizeX18: string][];
};
