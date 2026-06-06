export type HttpRequestMetric = {
	method: string;
	pathname: string;
	statusCode: number;
	durationMs: number;
	responseBytes?: number;
};

export type HttpRouteMetrics = {
	key: string;
	method: string;
	pathname: string;
	count: number;
	errorCount: number;
	averageDurationMs: number;
	minDurationMs: number;
	maxDurationMs: number;
	p95DurationMs: number;
	lastDurationMs: number;
	averageResponseBytes?: number;
	lastResponseBytes?: number;
};

export type SpreadsRunMetric = {
	durationMs: number;
	snapshotLoadMs: number;
	pairingMs: number;
	stabilityMs: number;
	filterMs: number;
	compactMs: number;
	snapshotCount: number;
	rawOpportunityCount: number;
	filteredOpportunityCount: number;
	responseOpportunityCount: number;
	errorCount: number;
	responseBytes?: number;
};

export type SpreadsMetricsSnapshot = {
	count: number;
	averageDurationMs: number;
	p95DurationMs: number;
	lastDurationMs: number;
	averageSnapshotLoadMs: number;
	lastSnapshotLoadMs: number;
	averagePairingMs: number;
	lastPairingMs: number;
	averageStabilityMs: number;
	lastStabilityMs: number;
	averageFilterMs: number;
	lastFilterMs: number;
	averageCompactMs: number;
	lastCompactMs: number;
	lastSnapshotCount: number;
	lastRawOpportunityCount: number;
	lastFilteredOpportunityCount: number;
	lastResponseOpportunityCount: number;
	lastErrorCount: number;
	averageResponseBytes?: number;
	lastResponseBytes?: number;
};

const HTTP_ROUTE_SAMPLE_LIMIT = 200;
const SPREADS_SAMPLE_LIMIT = 200;

type MutableHttpRouteMetrics = {
	method: string;
	pathname: string;
	count: number;
	errorCount: number;
	totalDurationMs: number;
	minDurationMs: number;
	maxDurationMs: number;
	lastDurationMs: number;
	totalResponseBytes: number;
	responseByteCount: number;
	lastResponseBytes?: number;
	durationSamplesMs: number[];
};

const httpRouteMetrics = new Map<string, MutableHttpRouteMetrics>();
const spreadsRuns: SpreadsRunMetric[] = [];

/** Records one completed HTTP request for route-level performance tracking. */
export const observeHttpRequest = (metric: HttpRequestMetric): void => {
	const key = createHttpRouteMetricKey(metric.method, metric.pathname);
	const currentMetric = httpRouteMetrics.get(key) ?? createHttpRouteMetric(metric);

	currentMetric.count += 1;
	currentMetric.errorCount += metric.statusCode >= 500 ? 1 : 0;
	currentMetric.totalDurationMs += metric.durationMs;
	currentMetric.minDurationMs = Math.min(
		currentMetric.minDurationMs,
		metric.durationMs,
	);
	currentMetric.maxDurationMs = Math.max(
		currentMetric.maxDurationMs,
		metric.durationMs,
	);
	currentMetric.lastDurationMs = metric.durationMs;
	currentMetric.durationSamplesMs.push(metric.durationMs);

	if (currentMetric.durationSamplesMs.length > HTTP_ROUTE_SAMPLE_LIMIT) {
		currentMetric.durationSamplesMs.shift();
	}

	if (metric.responseBytes !== undefined) {
		currentMetric.totalResponseBytes += metric.responseBytes;
		currentMetric.responseByteCount += 1;
		currentMetric.lastResponseBytes = metric.responseBytes;
	}

	httpRouteMetrics.set(key, currentMetric);
};

/** Returns route-level HTTP metrics sorted by path and method. */
export const getHttpMetricsSnapshot = (): HttpRouteMetrics[] =>
	[...httpRouteMetrics.entries()]
		.map(([key, metric]) => ({
			key,
			method: metric.method,
			pathname: metric.pathname,
			count: metric.count,
			errorCount: metric.errorCount,
			averageDurationMs: roundMetric(metric.totalDurationMs / metric.count),
			minDurationMs: roundMetric(metric.minDurationMs),
			maxDurationMs: roundMetric(metric.maxDurationMs),
			p95DurationMs: roundMetric(getPercentile(metric.durationSamplesMs, 0.95)),
			lastDurationMs: roundMetric(metric.lastDurationMs),
			...(metric.responseByteCount > 0
				? {
					averageResponseBytes: Math.round(
						metric.totalResponseBytes / metric.responseByteCount,
					),
					lastResponseBytes: metric.lastResponseBytes,
				}
				: {}),
		}))
		.sort((first, second) =>
			first.pathname.localeCompare(second.pathname) ||
			first.method.localeCompare(second.method),
		);

/** Records one completed spreads calculation run. */
export const observeSpreadsRun = (metric: SpreadsRunMetric): void => {
	spreadsRuns.push(metric);

	if (spreadsRuns.length > SPREADS_SAMPLE_LIMIT) {
		spreadsRuns.shift();
	}
};

/** Returns spreads calculation metrics for recent runs. */
export const getSpreadsMetricsSnapshot = (): SpreadsMetricsSnapshot | undefined => {
	if (spreadsRuns.length === 0) {
		return undefined;
	}

	const lastRun = spreadsRuns.at(-1) as SpreadsRunMetric;
	const responseByteRuns = spreadsRuns.filter(
		(metric) => metric.responseBytes !== undefined,
	);

	return {
		count: spreadsRuns.length,
		averageDurationMs: averageMetric(spreadsRuns, "durationMs"),
		p95DurationMs: roundMetric(
			getPercentile(spreadsRuns.map((metric) => metric.durationMs), 0.95),
		),
		lastDurationMs: roundMetric(lastRun.durationMs),
		averageSnapshotLoadMs: averageMetric(spreadsRuns, "snapshotLoadMs"),
		lastSnapshotLoadMs: roundMetric(lastRun.snapshotLoadMs),
		averagePairingMs: averageMetric(spreadsRuns, "pairingMs"),
		lastPairingMs: roundMetric(lastRun.pairingMs),
		averageStabilityMs: averageMetric(spreadsRuns, "stabilityMs"),
		lastStabilityMs: roundMetric(lastRun.stabilityMs),
		averageFilterMs: averageMetric(spreadsRuns, "filterMs"),
		lastFilterMs: roundMetric(lastRun.filterMs),
		averageCompactMs: averageMetric(spreadsRuns, "compactMs"),
		lastCompactMs: roundMetric(lastRun.compactMs),
		lastSnapshotCount: lastRun.snapshotCount,
		lastRawOpportunityCount: lastRun.rawOpportunityCount,
		lastFilteredOpportunityCount: lastRun.filteredOpportunityCount,
		lastResponseOpportunityCount: lastRun.responseOpportunityCount,
		lastErrorCount: lastRun.errorCount,
		...(responseByteRuns.length > 0
			? {
				averageResponseBytes: Math.round(
					responseByteRuns.reduce(
						(sum, metric) => sum + (metric.responseBytes ?? 0),
						0,
					) / responseByteRuns.length,
				),
				lastResponseBytes: lastRun.responseBytes,
			}
			: {}),
	};
};

/** Clears route metrics; intended for tests. */
export const clearHttpMetrics = (): void => {
	httpRouteMetrics.clear();
	spreadsRuns.length = 0;
};

const createHttpRouteMetricKey = (method: string, pathname: string): string =>
	`${method} ${pathname}`;

const createHttpRouteMetric = (
	metric: HttpRequestMetric,
): MutableHttpRouteMetrics => ({
	method: metric.method,
	pathname: metric.pathname,
	count: 0,
	errorCount: 0,
	totalDurationMs: 0,
	minDurationMs: Number.POSITIVE_INFINITY,
	maxDurationMs: 0,
	lastDurationMs: 0,
	totalResponseBytes: 0,
	responseByteCount: 0,
	durationSamplesMs: [],
});

const getPercentile = (values: number[], percentile: number): number => {
	if (values.length === 0) {
		return 0;
	}

	const sortedValues = [...values].sort((first, second) => first - second);
	const index = Math.ceil(sortedValues.length * percentile) - 1;

	return sortedValues[Math.max(0, index)] ?? 0;
};

const roundMetric = (value: number): number => Math.round(value * 100) / 100;

const averageMetric = (
	metrics: SpreadsRunMetric[],
	field: keyof Pick<
		SpreadsRunMetric,
		| "compactMs"
		| "durationMs"
		| "filterMs"
		| "pairingMs"
		| "snapshotLoadMs"
		| "stabilityMs"
	>,
): number =>
	roundMetric(
		metrics.reduce((sum, metric) => sum + metric[field], 0) / metrics.length,
	);
