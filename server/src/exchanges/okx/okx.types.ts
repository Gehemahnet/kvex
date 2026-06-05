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
