export type HyperliquidWsSubscriptionMessage = {
	method: "subscribe" | "unsubscribe";
	subscription:
		| {
				type: "allMids";
				dex?: string;
		  }
		| {
				type: "bbo";
				coin: string;
		  }
		| {
				type: "l2Book";
				coin: string;
		  }
		| {
				type: "activeAssetCtx";
				coin: string;
		  };
};

export type HyperliquidWsPingMessage = {
	method: "ping";
};

export type HyperliquidAllMidsMessage = {
	channel: "allMids";
	data: {
		mids: Record<string, string>;
	};
};

export type HyperliquidBboLevel = {
	px: string;
	sz: string;
	n: number;
};

export type HyperliquidBboMessage = {
	channel: "bbo";
	data: {
		coin: string;
		time: number;
		bbo: [HyperliquidBboLevel | null, HyperliquidBboLevel | null];
	};
};

export type HyperliquidL2BookMessage = {
	channel: "l2Book";
	data: {
		coin: string;
		time: number;
		levels: [HyperliquidBboLevel[], HyperliquidBboLevel[]];
	};
};

export type HyperliquidActiveAssetCtx = {
	dayNtlVlm?: string;
	funding?: string;
	markPx?: string;
	midPx?: string;
	openInterest?: string;
	oraclePx?: string;
	prevDayPx?: string;
};

export type HyperliquidActiveAssetCtxMessage = {
	channel: "activeAssetCtx";
	data: {
		coin: string;
		ctx: HyperliquidActiveAssetCtx;
	};
};
