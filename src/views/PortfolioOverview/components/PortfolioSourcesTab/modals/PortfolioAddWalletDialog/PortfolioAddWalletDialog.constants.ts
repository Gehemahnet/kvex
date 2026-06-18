import type { WalletType } from "@shared/types";

export const DIALOG_HINTS = {
    evm: "Use comma or new line for multiple EVM wallets. Balances update only after Apply.",
    solana: "Use comma or new line for multiple Solana wallets. Balances update only after Apply."
}

export const WALLET_NETWORK_OPTIONS: { label: string; value: WalletType }[] = [
    { label: "EVM", value: "evm" },
    { label: "Solana", value: "solana" },
];