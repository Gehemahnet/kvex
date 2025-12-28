// Адаптеры должны вызываться в композабле для каждой квери
export const createPacificaAdapter = (cfg?: any) => {
	// const client = usePacificaRestClient(cfg);
	const snapshotFn = async (market: string, depth?: number) =>
		client.getSnapshot(market, depth);
	const subscribeFn = (market: string, onDelta: (d: any) => void) =>
		client.subscribeWs(market, (raw) => {
			// assume raw contains channel/data
			const payload = raw?.data ?? raw;
			if (payload && (payload.inserts || payload.updates || payload.deletes))
				onDelta(payload);
		});
	const place = (o: any) => client.placeOrder(o);
	const cancel = (id: string) => client.cancelOrder(id);
	return { snapshotFn, subscribeFn, place, cancel };
};
