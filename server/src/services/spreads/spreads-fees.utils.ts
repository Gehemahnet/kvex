import type { MarketSnapshot } from "../markets/market-snapshots.types";
import type { SpreadFeeProfile } from "./spreads.types";

/** Applies user-specific fee profiles to matching market snapshots. */
export const applySpreadFeeProfiles = (
	snapshots: MarketSnapshot[],
	feeProfiles: SpreadFeeProfile[] = [],
	now: number = Date.now(),
): MarketSnapshot[] => {
	if (feeProfiles.length === 0) {
		return snapshots;
	}

	return snapshots.map((snapshot) => {
		const feeProfile = findSpreadFeeProfile(snapshot, feeProfiles, now);

		if (feeProfile === undefined) {
			return snapshot;
		}

		return {
			...snapshot,
			makerFeeRate: feeProfile.makerFeeRate,
			takerFeeRate: feeProfile.takerFeeRate,
			feeSource: "api",
		};
	});
};

const findSpreadFeeProfile = (
	snapshot: MarketSnapshot,
	feeProfiles: SpreadFeeProfile[],
	now: number,
): SpreadFeeProfile | undefined =>
	feeProfiles.find((feeProfile) =>
		feeProfile.exchange === snapshot.exchange &&
		matchesFeeProfileSymbol(snapshot, feeProfile) &&
		matchesFeeProfileMarketType(snapshot, feeProfile) &&
		!isFeeProfileExpired(feeProfile, now)
	);

const matchesFeeProfileSymbol = (
	snapshot: MarketSnapshot,
	feeProfile: SpreadFeeProfile,
): boolean =>
	feeProfile.symbol === undefined ||
	feeProfile.symbol === snapshot.symbol ||
	feeProfile.symbol === snapshot.sourceSymbol;

const matchesFeeProfileMarketType = (
	snapshot: MarketSnapshot,
	feeProfile: SpreadFeeProfile,
): boolean =>
	feeProfile.marketType === undefined ||
	snapshot.contractType === undefined ||
	snapshot.contractType === "unknown" ||
	feeProfile.marketType === snapshot.contractType;

const isFeeProfileExpired = (
	feeProfile: SpreadFeeProfile,
	now: number,
): boolean =>
	feeProfile.expiresAt !== undefined &&
	new Date(feeProfile.expiresAt).getTime() <= now;
