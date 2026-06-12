# MCP

## PrimeVue

- Project config: `.vscode/mcp.json`
- Server command: `npx -y @primevue/mcp`
- Codex registration: `codex mcp add primevue -- npx -y @primevue/mcp`
- Purpose: PrimeVue documentation for component props, events, slots, examples, theming, Pass Through, tokens, and accessibility guidance.
- Runtime note: MCP is an AI/IDE documentation server and should not be bundled into frontend runtime code.

## Local Theme Docs

- PrimeVue theme customization notes: `docs/PRIMEVUE_THEME.md`

## GoldRush

- API key env example: `GOLDRUSH_API_KEY` in `.env.example`
- Documentation index: `https://goldrush.mintlify.app/`
- LLM documentation source: `https://goldrush.dev/docs/llms.txt`
- Supported chains: `https://goldrush.mintlify.app/chains/overview`
- Multichain balances: `https://goldrush.mintlify.app/api-reference/foundational-api/cross-chain/get-allchains-balances`
- Purpose: portfolio wallet balance discovery across EVM chains, token USD values, token logos, spam filtering, and HyperEVM coverage where Alchemy is not enough.
- Runtime note: GoldRush is a backend REST data provider for portfolio reads. The docs/LLM source is for development context; do not bundle documentation MCP tooling into app runtime.
