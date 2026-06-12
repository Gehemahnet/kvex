import { FetchHttpClient, type HttpClient } from "../../common/http-client";
import type {
	SolanaJsonRpcRequest,
	SolanaJsonRpcResponse,
} from "./wallet-balances.types";

export type SolanaJsonRpcClient = {
	call<Result>(method: string, params: unknown[]): Promise<Result>;
};

/** Creates a minimal Solana JSON-RPC client backed by the shared HTTP client. */
export const createSolanaJsonRpcClient = (
	rpcUrl: string,
	httpClient: HttpClient = new FetchHttpClient(),
): SolanaJsonRpcClient => {
	let requestId = 0;

	return {
		async call<Result>(method: string, params: unknown[]): Promise<Result> {
			requestId += 1;

			const response = await httpClient.post<
				SolanaJsonRpcResponse<Result>,
				SolanaJsonRpcRequest,
				Record<string, never>
			>(
				rpcUrl,
				{
					id: requestId,
					jsonrpc: "2.0",
					method,
					params,
				},
				{},
			);

			if (response.error) {
				throw new Error(response.error.message);
			}

			if (response.result === undefined) {
				throw new Error(`JSON-RPC ${method} returned no result`);
			}

			return response.result;
		},
	};
};
