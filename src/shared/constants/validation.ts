import type {WalletType} from "../types";

export const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
export const SOLANA_ADDRESS_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const WALLET_ADDRESS_VALIDATION_PATTERNS: Record<WalletType, string | RegExp> = {
    evm: EVM_ADDRESS_PATTERN,
    solana: SOLANA_ADDRESS_PATTERN
}