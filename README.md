# @0xgasless/agent

[![npm](https://img.shields.io/npm/v/@0xgasless/agent.svg)](https://www.npmjs.com/package/@0xgasless/agent)
[![types](https://img.shields.io/npm/types/typescript.svg)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/npm/l/@0xgasless/agent.svg)](./LICENSE)

The TypeScript client for the **0xgas agent platform**. Give your AI agents a stablecoin wallet, let them pay merchants per call via **x402**, and give them an on-chain **ERC-8004** identity — all without ever holding a private key in your application.

```bash
npm install @0xgasless/agent
```

## What you get

- **Server-managed wallets** — every agent's keys live in 0xgas KMS (HD-derived on Free/Builder tiers, dedicated KMS on Enterprise). Your app never sees a private key.
- **x402 micropayments** — sign canonical EIP-3009 `TransferWithAuthorization` for USDC on Avalanche, Fuji, Base. Policy enforced before signing — per-call + per-day spend caps live in the platform, not in your app.
- **No gas on the agent** — the 0xgas facilitator pays the on-chain gas. Agents only hold the USDC they need to spend.
- **Live audit log** — every `/verify` and `/settle` is recorded in DynamoDB; surface it in your own UI or query for compliance.
- **Multi-chain from day one** — same SDK call, just change `chain`. EVM (`avalanche`, `avalanche-fuji`, `base`) and Solana (`solana`, `solana-devnet`).

## Quick start

```ts
import { OxGasAgent } from '@0xgasless/agent';

const client = new OxGasAgent({
  apiKey: process.env.OXGAS_API_KEY!,   // grab from dashboard.0xgasless.com
});

// 1. Enable x402 for the project (one-time)
await client.policy.enableX402();

// 2. Create an agent wallet (idempotent)
const agent = await client.agents.create({
  agentId:     'trading-bot-1',
  displayName: 'Trading bot',
});
console.log('Agent address:', agent.address);
//          0xb0e6ec46…7994b7aadd2b  ← fund this with USDC on the agent's chain

// 3. Pay a merchant via x402 ($0.50 USDC)
const result = await client.x402.pay({
  agentId: agent.agentId,
  to:      '0xMerchantAddress…',
  value:   '500000',     // atomic units (USDC = 6 decimals)
});
console.log('Tx hash:', result.settle?.transaction);
```

## API surface

```ts
client.agents.create(input)              // POST /v1/agent/create
client.agents.list(opts?)                // GET  /v1/agent/list
client.agents.get(agentId)               // GET  /v1/agent/get
client.agents.getBalance(agentId, opts?) // GET  /v1/agent/balance   (chain='all' supported)
client.agents.revoke(agentId)            // POST /v1/agent/revoke    (terminal)

client.policy.get(agentId?)              // GET  /v1/agent/policy    (tier max + project default + agent override)
client.policy.enableX402()
client.policy.disableX402()
client.policy.setProjectDefault(policy)
client.policy.setAgent(agentId, policy)

client.x402.sign(input)                  // POST /v1/agent/x402/sign — returns canonical x402 v2 payload
client.x402.pay(input)                   // sign + settle in one call

client.agents.activity(agentId, opts?)   // GET  /v1/agent/activity  (recent verify + settle audit rows)

client.identity.link({ agentId, chain }) // POST /v1/agent/identity/link  (ERC-8004 mint, gas sponsored)
client.identity.info()                   // GET  /identity/info on the facilitator (chains + sponsor addresses)

client.facilitator.verify(payload, req)  // POST /verify  on the facilitator
client.facilitator.settle(payload, req)  // POST /settle  on the facilitator
```

## Solana (same API, exact-SVM scheme)

The same calls work on Solana — pass a Solana `chain`. Agents get an Ed25519
wallet (base58 address), pay in USDC or XSGD, and the facilitator sponsors gas
just like on EVM. USD caps, tiers, and policy are identical.

```ts
// Create a Solana agent (Ed25519, base58 address)
const agent = await client.agents.create({
  agentId: 'sol-bot-1',
  chain:   'solana',          // or 'solana-devnet' for testing
});
console.log(agent.address);   // e.g. J1Pgf2xWL2tt2A1Uuor19jGsr2rXGprobmEwMVnq2ZuY
//                            ← fund with USDC/XSGD on Solana

// Pay a merchant — 10 XSGD
const result = await client.x402.pay({
  agentId:     'sol-bot-1',
  to:          '8zkHBZ…',      // recipient wallet (base58); its token account must exist
  value:       '10000000',     // atomic units (6 decimals)
  tokenSymbol: 'XSGD',
  chain:       'solana',
});
console.log('Signature:', result.settle?.transaction);
```

The payload differs by family — on Solana it carries a base64 partially-signed
transaction rather than an EIP-712 signature. If you inspect payloads directly,
narrow with the `isSvmPayload` guard:

```ts
import { isSvmPayload } from '@0xgasless/agent';

const signed = await client.x402.sign({ agentId: 'sol-bot-1', to, value, tokenSymbol: 'XSGD', chain: 'solana' });
if (isSvmPayload(signed.paymentPayload)) {
  console.log('base64 tx:', signed.paymentPayload.payload.transaction);
}
```

**Note:** on Solana the recipient must already have an Associated Token Account
for the mint (the gasless fee-payer can't fund ATA creation). Any wallet that
has ever held that token already has one.

## Paying any x402 endpoint on the internet (`payFetch`)

New in 2.2.0. `payFetch` runs the standard x402 client flow against **any**
402-responding URL — probe, parse the merchant's payment requirements, sign
with the agent's custodied wallet (policy caps enforced as always), retry with
the base64 `X-PAYMENT` header:

```ts
const { response, payment } = await client.x402.payFetch(
  'https://api.example.com/paid-data',
  {
    agentId: 'bot-1',
    maxValue: '1000000',              // refuse to pay more than 1 USDC
    chains: ['avalanche', 'base'],    // optional: restrict payable chains
  },
);
const data = await response.json();
```

For an owner approval service, risk engine, or destination allowlist, use the
optional fail-closed hook. It runs after the SDK selects and validates the
merchant requirement and before it requests a KMS signature:

```ts
const { response } = await client.x402.payFetch(url, {
  agentId: 'bot-1',
  maxValue: '1000000',
  beforePayment: async ({ url, agentId, requirement, chain, tokenSymbol }) => {
    await authorize({ url, agentId, requirement, chain, tokenSymbol });
    // Throw or reject to stop before signing.
  },
});
```

Notes:
- Non-402 responses pass straight through (no payment, `payment` is undefined).
- The merchant picks the requirement list; `payFetch` selects the first entry
  the platform can satisfy (supported chain + USDC/XSGD). Unpayable → clear error.
- The merchant's side settles (that's the x402 model). When the merchant runs on
  the 0xgasless facilitator, settlement lands on x402.0xgasless.com as usual.
- Wire-format helpers are exported for custom flows: `toX402Envelope(signed)`,
  `encodeXPaymentHeader(envelope)`, `parseAccepts(body)`, `selectRequirement(accepts)`.

## ERC-8004 identity (gas-sponsored)

```ts
// Mint an on-chain identity NFT for your agent. 0xgas pays the gas.
const identity = await client.identity.link({
  agentId: 'trading-bot-1',
  chain:   'fuji',   // or 'avalanche'
});
console.log(`Token #${identity.agentTokenId} minted, tx ${identity.txHash}`);
```

The identity NFT is minted to the 0xgas sponsor wallet — your agent's address is recorded in the on-chain `agentURI` metadata. Other contracts can `tokenURI(id)` to look up the agent's address and basic profile.

## Reading activity

```ts
const a = await client.agents.activity('trading-bot-1', { days: 7 });
console.log(a.summary);
// {
//   verifyCount: 3,
//   settlementCount: 5,
//   successfulSettlements: 5,
//   spentTotalUSD: '2.500000'
// }
// → a.settlements, a.verifies arrays carry tx hashes, recipients, timestamps
```

The audit log is read straight from DynamoDB and partitioned by `chainId#date`, so a 7-day query is cheap regardless of how many agents you have.

## Configuration

```ts
const client = new OxGasAgent({
  apiKey:         '0xgas_live_sk_…',                // required
  apiUrl:         '…',                              // optional — defaults to platform prod
  facilitatorUrl: 'https://x402.0xgasless.com',     // optional — point at your own facilitator
  fetch:          customFetch,                      // optional — Node 18+ has built-in fetch
});
```

## Tier limits (defaults)

| Tier | Max agents | Per-call cap | Per-day cap | Chains | Tokens |
|---|---|---|---|---|---|
| Free | 5 | $5 USDC | $50 USDC | Fuji testnet | USDC |
| Builder | 20 | $50 USDC | $500 USDC | Avalanche, Fuji | USDC |
| Enterprise | custom | custom | custom | custom | custom |

Spend caps are silently clamped to your tier ceiling — set `$1000/call` on Free and it stores `$5/call`.

## Error handling

Every API failure throws `AgentApiError` with the HTTP status and the server's structured error:

```ts
import { AgentApiError } from '@0xgasless/agent';

try {
  await client.x402.pay({ agentId, to, value: '6000000' }); // $6 on Free tier
} catch (err) {
  if (err instanceof AgentApiError && err.status === 403) {
    console.log('Hit cap:', err.code, err.body);
    // → 'per_tx_cap_exceeded'  { requestedUSD: '6.000000', perTxCapUSD: '5' }
  }
}
```

## Full example

See [`examples/quickstart.ts`](https://github.com/0xgasless/agent-sdk/blob/main/examples/quickstart.ts) for end-to-end: enable x402 → create agent → register identity → pay merchant → read activity.

Run it with:

```bash
OXGAS_API_KEY=0xgas_live_sk_... npx tsx examples/quickstart.ts
```

## What's NOT in v2

The legacy `@0xgasless/agent-sdk` had wallet abstraction (Privy, Safe, session keys), LangChain tool wrappers, and a CLI. v2 drops all of that — the platform owns the wallet and enforces policy server-side, which is the right design for autonomous agents. If you need that legacy surface, install `@0xgasless/agent-sdk@0.1.x` (different package).

## Links

- 📊 **Dashboard:** https://dashboard.0xgasless.com
- 🔧 **Facilitator:** https://x402.0xgasless.com
- 🪪 **ERC-8004 spec:** https://eips.ethereum.org/EIPS/eip-8004
- 💸 **x402 spec:** https://github.com/coinbase/x402

## License

MIT — © 2026 0xgasless
