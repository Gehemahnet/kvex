import type { IncomingMessage, ServerResponse } from "node:http";
import { getWalletBalances } from "../../../services/portfolio/wallet-balances.service";
import type { WalletBalancesResponse } from "../../../services/portfolio/wallet-balances.types";
import { writeJsonResponse } from "../http-response.utils";
import { parseWalletBalancesQuery } from "./wallet-balances-query";

/** Handles `GET /portfolio/wallet-balances` for public wallet/token balance reads. */
export const getWalletBalancesHandler = async (
	request: IncomingMessage,
	response: ServerResponse,
) => {
	const query = parseWalletBalancesQuery(request.url);
	const data: WalletBalancesResponse = await getWalletBalances(query);

	writeJsonResponse(response, 200, data);
};
