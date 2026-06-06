import { beforeEach, describe, expect, it } from "vitest";
import {
	clearHttpMetrics,
	getHttpMetricsSnapshot,
	getSpreadsMetricsSnapshot,
	observeHttpRequest,
	observeSpreadsRun,
} from "../../src/common/metrics";

describe("metrics", () => {
	beforeEach(() => {
		clearHttpMetrics();
	});

	it("aggregates HTTP route timing and response size metrics", () => {
		observeHttpRequest({
			method: "GET",
			pathname: "/spreads",
			statusCode: 200,
			durationMs: 10,
			responseBytes: 100,
		});
		observeHttpRequest({
			method: "GET",
			pathname: "/spreads",
			statusCode: 200,
			durationMs: 30,
			responseBytes: 300,
		});
		observeHttpRequest({
			method: "GET",
			pathname: "/spreads",
			statusCode: 500,
			durationMs: 20,
		});

		expect(getHttpMetricsSnapshot()).toEqual([
			{
				key: "GET /spreads",
				method: "GET",
				pathname: "/spreads",
				count: 3,
				errorCount: 1,
				averageDurationMs: 20,
				minDurationMs: 10,
				maxDurationMs: 30,
				p95DurationMs: 30,
				lastDurationMs: 20,
				averageResponseBytes: 200,
				lastResponseBytes: 300,
			},
		]);
	});

	it("aggregates spreads calculation metrics", () => {
		observeSpreadsRun({
			durationMs: 100,
			snapshotLoadMs: 80,
			pairingMs: 10,
			stabilityMs: 4,
			filterMs: 2,
			compactMs: 1,
			snapshotCount: 10,
			rawOpportunityCount: 8,
			filteredOpportunityCount: 5,
			responseOpportunityCount: 5,
			errorCount: 1,
			responseBytes: 1000,
		});
		observeSpreadsRun({
			durationMs: 200,
			snapshotLoadMs: 120,
			pairingMs: 20,
			stabilityMs: 8,
			filterMs: 4,
			compactMs: 2,
			snapshotCount: 20,
			rawOpportunityCount: 16,
			filteredOpportunityCount: 12,
			responseOpportunityCount: 12,
			errorCount: 0,
			responseBytes: 2000,
		});

		expect(getSpreadsMetricsSnapshot()).toEqual({
			count: 2,
			averageDurationMs: 150,
			p95DurationMs: 200,
			lastDurationMs: 200,
			averageSnapshotLoadMs: 100,
			lastSnapshotLoadMs: 120,
			averagePairingMs: 15,
			lastPairingMs: 20,
			averageStabilityMs: 6,
			lastStabilityMs: 8,
			averageFilterMs: 3,
			lastFilterMs: 4,
			averageCompactMs: 1.5,
			lastCompactMs: 2,
			lastSnapshotCount: 20,
			lastRawOpportunityCount: 16,
			lastFilteredOpportunityCount: 12,
			lastResponseOpportunityCount: 12,
			lastErrorCount: 0,
			averageResponseBytes: 1500,
			lastResponseBytes: 2000,
		});
	});
});
