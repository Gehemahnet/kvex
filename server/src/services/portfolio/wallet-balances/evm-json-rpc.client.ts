import { FetchHttpClient, type HttpClient } from "#common/http-client";
import type { EvmJsonRpcRequest, EvmJsonRpcResponse } from "#services/portfolio/wallet-balances/wallet-balances.types";

export type EvmJsonRpcClient = {
	call<Result = string>(
		method: string,
		params: unknown[],
	): Promise<Result>;
};

/** Creates a minimal EVM JSON-RPC client backed by the shared HTTP client. */
export const createEvmJsonRpcClient = (
	rpcUrl: string,
	httpClient: HttpClient = new FetchHttpClient(),
): EvmJsonRpcClient => {
	let requestId = 0;

	return {
		async call<Result = string>(
			method: string,
			params: unknown[],
		): Promise<Result> {
			requestId += 1;

			const response = await httpClient.post<
				EvmJsonRpcResponse<Result>,
				EvmJsonRpcRequest,
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
