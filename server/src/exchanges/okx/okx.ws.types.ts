export type OkxWsSubscriptionMessage = {
	op: "subscribe" | "unsubscribe";
	args: OkxWsSubscriptionArg[];
};

export type OkxWsSubscriptionArg =
	| {
			channel: "tickers";
			instId: string;
	  }
	| {
			channel: "funding-rate";
			instId: string;
	  }
	| {
			channel: "books5";
			instId: string;
	  };

export type OkxTickerData = {
	instId: string;
	last?: string;
	bidPx?: string;
	bidSz?: string;
	askPx?: string;
	askSz?: string;
	volCcy24h?: string;
	ts?: string;
};

export type OkxFundingRateData = {
	instId: string;
	fundingRate?: string;
	fundingTime?: string;
	nextFundingTime?: string;
	ts?: string;
};

export type OkxTickerMessage = {
	arg: {
		channel: "tickers";
		instId: string;
	};
	data: OkxTickerData[];
};

export type OkxFundingRateMessage = {
	arg: {
		channel: "funding-rate";
		instId: string;
	};
	data: OkxFundingRateData[];
};

export type OkxBookData = {
	instId: string;
	asks: string[][];
	bids: string[][];
	ts?: string;
};

export type OkxBookMessage = {
	arg: {
		channel: "books5";
		instId: string;
	};
	data: OkxBookData[];
};
