import { Exchange, Period } from "../../common/types";

export const SUPPORTED_FUNDING_EXCHANGES: Exchange[] = [
	"hyperliquid",
	"pacifica",
	"ethereal",
];

export const SUPPORTED_ETHEREAL_PERIODS: Period[] = ["DAY", "WEEK", "MONTH"];
