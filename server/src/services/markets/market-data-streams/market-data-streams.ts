import { etherealMarketDataStream } from "#exchanges/ethereal/ethereal.ws";
import { hyperliquidMarketDataStream } from "#exchanges/hyperliquid/hyperliquid.ws";
import { nadoMarketDataStream } from "#exchanges/nado/nado.ws";
import { okxMarketDataStream } from "#exchanges/okx/okx.ws";
import { pacificaMarketDataStream } from "#exchanges/pacifica/pacifica.ws";

/** Starts all exchange market-data collectors that feed the snapshot store. */
export const startMarketDataStreams = (): void => {
	etherealMarketDataStream.connect();
	hyperliquidMarketDataStream.connect();
	nadoMarketDataStream.connect();
	okxMarketDataStream.connect();
	pacificaMarketDataStream.connect();
};

/** Stops all exchange market-data collectors during server shutdown or tests. */
export const stopMarketDataStreams = (): void => {
	etherealMarketDataStream.disconnect();
	hyperliquidMarketDataStream.disconnect();
	nadoMarketDataStream.disconnect();
	okxMarketDataStream.disconnect();
	pacificaMarketDataStream.disconnect();
};
