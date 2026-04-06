import { Exchange } from "../common/types";
import {
	type EtherealDexClientType,
	etherealRestClient,
} from "./ethereal/ethereal";
import {
	type HyperliquidDexClientType,
	hyperliquidRestClient,
} from "./hyperliquid/hyperliquid";
import {
	type PacificaDexClientType,
	pacificaRestClient,
} from "./pacifica/pacifica";

export const EXCHANGE_REST_CLIENT_MAP: Record<
	Exchange,
	InstanceType<
		EtherealDexClientType | PacificaDexClientType | HyperliquidDexClientType
	>
> = {
	ethereal: etherealRestClient,
	pacifica: pacificaRestClient,
	hyperliquid: hyperliquidRestClient,
};
