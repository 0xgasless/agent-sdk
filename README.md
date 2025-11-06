# Agent SDK (ERC-8004 + x402)

A universal, chain-agnostic SDK that combines:
- ERC-8004 identity/reputation/validation for agents
- x402 gasless payments via any compatible facilitator

## Install

```bash
cd agent-sdk
npm install
npm run build
```

## Quick Start

```ts
import { AgentSDK } from './dist';

const sdk = new AgentSDK({
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  defaultNetwork: 'bsc-testnet',
  networks: {
    'bsc-testnet': {
      name: 'bsc-testnet',
      chainId: 97,
      rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545',
      erc8004: {
        identityRegistry: '0x...',
        reputationRegistry: '0x...',
        validationRegistry: '0x...'
      },
      x402: {
        facilitatorUrl: 'https://facilitator.example.com',
        defaultToken: '0xUSDT',
        domainName: 'B402',
        domainVersion: '1'
      }
    }
  }
});

// ERC-8004: register an agent
await sdk.erc8004.identity().registerAgent('ipfs://agent-card.json');

// x402-aware fetch
const res = await sdk.fetch('https://paid-api.example.com/data');
```

## Notes
- Replace placeholder ERC-8004 ABIs with your deployed registries.
- Works with any x402-compatible facilitator by URL.
- Fully chain-agnostic via network configuration.


