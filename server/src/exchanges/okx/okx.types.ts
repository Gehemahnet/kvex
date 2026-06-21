export type OkxResponse<T> = {
	code: string;
	msg: string;
	data: T[];
};

export type OkxInstrument = {
	instId: string;
	instType: "SWAP";
	state: string;
};

export type OkxTicker = {
	instId: string;
	last?: string;
	bidPx?: string;
	bidSz?: string;
	askPx?: string;
	askSz?: string;
	volCcy24h?: string;
	ts?: string;
};

export type OkxBalanceDetail = {
	availBal?: string;
	availEq?: string;
	cashBal?: string;
	ccy: string;
	disEq?: string;
	eq?: string;
	eqUsd?: string;
	frozenBal?: string;
	uTime?: string;
};

export type OkxAccountBalance = {
	adjEq?: string;
	details?: OkxBalanceDetail[];
	totalEq?: string;
	uTime?: string;
};

export type OkxTradeFee = {
	category?: string;
	instType?: string;
	level?: string;
	maker?: string;
	taker?: string;
	ts?: string;
};

export type OkxPosition = {
	avgPx?: string;
	imr?: string;
	instId: string;
	instType: string;
	lever?: string;
	liqPx?: string;
	margin?: string;
	markPx?: string;
	mgnMode?: string;
	notionalUsd?: string;
	pos: string;
	posSide?: string;
	uTime?: string;
	upl?: string;
	uplRatio?: string;
};

export type OkxPositionHistory = {
	closeAvgPx: string;
	closeTotalPos: string;
	cTime: string;
	direction: "long" | "short";
	instId: string;
	instType: string;
	openAvgPx: string;
	openMaxPos: string;
	posId: string;
	posSide: string;
	realizedPnl: string;
	type: string;
	uTime: string;
};
