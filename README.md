# @0xgasless/agent-sdk

<div align="center">

![Version](https://img.shields.io/npm/v/@0xgasless/agent-sdk?style=flat-square)
![License](https://img.shields.io/npm/l/@0xgasless/agent-sdk?style=flat-square)
![Node](https://img.shields.io/node/v/@0xgasless/agent-sdk?style=flat-square)

**The Financial Layer for Autonomous AI Agents**

ERC-8004 Identity + x402 Gasless Payments + MoltPay CLI

[Quick Start](#-quick-start) • [MoltPay CLI](#-moltpay-cli) • [SDK Reference](#-sdk-reference) • [Examples](#-examples)

</div>

---

## 🎯 What is this?

A **wallet-agnostic** SDK for building autonomous AI agents on Avalanche with:

- 🆔 **ERC-8004** - On-chain agent identity, reputation, and validation
- 💸 **x402 Payments** - Gasless payments via 0xGasless facilitator
- 🦞 **MoltPay CLI** - Interactive command-line for agent registration & payments
- 🤖 **LangChain Tools** - Pre-built tools for AI agent frameworks
- 🔗 **Fetch.ai Integration** - Optional ASI-1 agent integration

---

## 📦 Installation

### NPM Package

```bash
npm install @0xgasless/agent-sdk ethers
```

### Global CLI (MoltPay)

```bash
# Install globally for CLI access
npm install -g @0xgasless/agent-sdk

# Or use npx without installing
npx @0xgasless/agent-sdk moltpay --help
```

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install @0xgasless/agent-sdk ethers dotenv
```

### Step 2: Create Environment File

```bash
# .env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
```

### Step 3: Initialize SDK

```typescript
import { AgentSDK, fujiConfig } from '@0xgasless/agent-sdk';
import { Wallet, JsonRpcProvider } from 'ethers';
import 'dotenv/config';

// Create wallet from private key
const provider = new JsonRpcProvider(process.env.RPC_URL);
const wallet = new Wallet(process.env.PRIVATE_KEY!, provider);

// Initialize SDK
const sdk = new AgentSDK({
  networks: fujiConfig.networks,
  defaultNetwork: 'fuji',
  signer: wallet,
});

// Register agent on ERC-8004
const agentId = await sdk.erc8004.identity().register('ipfs://QmAgentMetadata...');
console.log('Agent registered with ID:', agentId);
```

---

## 🦞 MoltPay CLI

MoltPay is the interactive CLI for managing agent wallets, registrations, and payments.

### Installation

```bash
# Global install (recommended)
npm install -g @0xgasless/agent-sdk

# Verify installation
moltpay --help
```

### Commands

| Command | Description |
|---------|-------------|
| `moltpay init` | Initialize agent wallet and environment |
| `moltpay register` | Register agent identity on ERC-8004 |
| `moltpay pay` | Send crypto payments |
| `moltpay verify` | Verify agent on MoltBook social graph |

### Step-by-Step Setup

#### 1. Initialize Your Agent

```bash
moltpay init
```

Follow the interactive prompts:
- Select network: **Avalanche Fuji (Testnet)** or **Avalanche Mainnet**
- Enter private key or generate new wallet

This creates a `.env` file with your configuration.

#### 2. Register on ERC-8004

```bash
moltpay register
```

This will:
- Check if you already have an identity
- Prompt for agent name and service domain
- Mint your ERC-8004 identity NFT on-chain

#### 3. Make Payments

```bash
# Interactive mode
moltpay pay

# Direct mode
moltpay pay 10 USDC 0xRecipientAddress
```

#### 4. Verify on MoltBook (Optional)

```bash
moltpay verify
```

Links your on-chain identity to your social presence.

### Hosted CLI (Coming Soon)

```bash
# 🚧 COMING SOON - Hosted version with managed wallets
# npx @0xgasless/moltpay-hosted login
# npx @0xgasless/moltpay-hosted dashboard
```

---

## 📍 Deployed Contracts

### Avalanche C-Chain Mainnet (Chain ID: 43114) ✅ LIVE

#### ERC-8004 Registries

| Contract | Address |
|----------|---------|
| IdentityRegistry | [`0x06d49e79da8a241dd2c412bf5d22e19c619a39d1`](https://snowtrace.io/address/0x06d49e79da8a241dd2c412bf5d22e19c619a39d1) |
| ReputationRegistry | [`0x29A62d678dCc581414BB3A74dF27E99c17e60dD7`](https://snowtrace.io/address/0x29A62d678dCc581414BB3A74dF27E99c17e60dD7) |
| ValidationRegistry | [`0xa490b79113d8ef4e7c7912759a3fcaff8a58cd05`](https://snowtrace.io/address/0xa490b79113d8ef4e7c7912759a3fcaff8a58cd05) |
| ValidationPlugin | [`0x83dab1f7be37c5c4b84743b72642c9651de7f12b`](https://snowtrace.io/address/0x83dab1f7be37c5c4b84743b72642c9651de7f12b) |

#### x402 Gasless Payments

| Component | Value |
|-----------|-------|
| Facilitator URL | `https://x402.0xgasless.com` |
| Relayer Contract | [`0x457Db7ceBAdaF6A043AcE833de95C46E982cEdC8`](https://snowtrace.io/address/0x457Db7ceBAdaF6A043AcE833de95C46E982cEdC8) |
| EIP-712 Domain | `{ name: "A402", version: "1", chainId: 43114 }` |

#### Supported Payment Tokens

| Token | Address | Decimals |
|-------|---------|----------|
| USDC (Native) | [`0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E`](https://snowtrace.io/address/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E) | 6 |
| USDT (Native) | [`0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`](https://snowtrace.io/address/0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7) | 6 |
| USDC.e (Bridged) | [`0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664`](https://snowtrace.io/address/0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664) | 6 |
| USDT.e (Bridged) | [`0xc7198437980c041c805A1EDcbA50c1Ce5db95118`](https://snowtrace.io/address/0xc7198437980c041c805A1EDcbA50c1Ce5db95118) | 6 |

---

### Avalanche Fuji Testnet (Chain ID: 43113)

#### ERC-8004 Registries

| Contract | Address |
|----------|---------|
| IdentityRegistry | [`0x372d406040064a9794d14f3f8fec0f2e13e5b99f`](https://testnet.snowtrace.io/address/0x372d406040064a9794d14f3f8fec0f2e13e5b99f) |
| ReputationRegistry | [`0x8B106121EeEC204a1EA012E8560090a85d4C5350`](https://testnet.snowtrace.io/address/0x8B106121EeEC204a1EA012E8560090a85d4C5350) |
| ValidationRegistry | [`0x6ab685d73513918a5d76d90cbc089583b92f029e`](https://testnet.snowtrace.io/address/0x6ab685d73513918a5d76d90cbc089583b92f029e) |
| ValidationPlugin | [`0x6b35bEc82E5623dbc67Aa921dB10fF719C77E1fB`](https://testnet.snowtrace.io/address/0x6b35bEc82E5623dbc67Aa921dB10fF719C77E1fB) |

#### x402 Gasless Payments (Testnet)

| Component | Value |
|-----------|-------|
| Facilitator URL | `http://testnet.0xgasless.com` |
| Relayer Contract | [`0x8BD697733c31293Be2327026d01aE393Ab2675C4`](https://testnet.snowtrace.io/address/0x8BD697733c31293Be2327026d01aE393Ab2675C4) |

---

## 📖 SDK Reference

### Core SDK

```typescript
import { AgentSDK, fujiConfig } from '@0xgasless/agent-sdk';

const sdk = new AgentSDK({
  networks: fujiConfig.networks,
  defaultNetwork: 'fuji',
  signer: wallet, // Any ethers.Signer
});

// Get wallet address
const address = await sdk.getAddress();

// Access ERC-8004 clients
const identity = sdk.erc8004.identity();
const reputation = sdk.erc8004.reputation();
const validation = sdk.erc8004.validation();

// Access x402 facilitator
const facilitator = sdk.getFacilitator();
```

### ERC-8004 Identity

```typescript
import { IdentityV2 } from '@0xgasless/agent-sdk';

// Register new agent
const agentId = await identity.register('ipfs://metadata-uri');

// Get agent by owner
const agentId = await identity.getAgentIdByOwner('0xOwnerAddress');

// Get agent metadata URI
const uri = await identity.tokenURI(agentId);

// Check balance
const count = await identity.balanceOf('0xAddress');
```

### ERC-8004 Reputation

```typescript
import { ReputationV2 } from '@0xgasless/agent-sdk';

// Get reputation score
const score = await reputation.getScore(agentId);

// Get reputation history
const history = await reputation.getHistory(agentId);
```

### x402 Payments

```typescript
import { FacilitatorClient, x402Fetch } from '@0xgasless/agent-sdk';

// Create payment payload
const payload = await sdk.x402.createPaymentPayload({
  to: '0xRecipient',
  amount: '5000000', // 5 USDT (6 decimals)
  token: '0xUSDTAddress',
});

// Use x402 fetch for gasless requests
const response = await x402Fetch('https://api.example.com/paid-endpoint', {
  method: 'POST',
  headers: { 'X-402-Payment': JSON.stringify(payload) },
});
```

### LangChain Tools

```typescript
import { getAgentTools, registerAgentTool, getBalanceTool } from '@0xgasless/agent-sdk';

// Get all pre-built tools
const tools = getAgentTools(sdk);

// Or use individual tools
const registerTool = registerAgentTool(sdk);
const balanceTool = getBalanceTool(sdk);

// Use with LangChain agent
const agent = new ChatOpenAI({ ... });
const chain = AgentExecutor.fromAgentAndTools({
  agent,
  tools,
});
```

### Session Keys (For Autonomous Agents)

```typescript
import { SessionKeyHelper } from '@0xgasless/agent-sdk';
import { parseUnits } from 'ethers';

// Generate session key with constraints
const sessionKey = SessionKeyHelper.generateSessionKey({
  maxSpendPerTx: parseUnits('10', 6),      // 10 USDT per tx
  maxSpendPerDay: parseUnits('100', 6),    // 100 USDT per day
  validForSeconds: 7 * 24 * 60 * 60,       // 7 days
  whitelistedContracts: ['0x...'],
});

// Create wallet from session key
const sessionWallet = SessionKeyHelper.createWallet(sessionKey, provider);

// Validate before spending
const validation = SessionKeyHelper.validateTransaction(
  sessionKey,
  { to: '0x...', value: parseUnits('5', 6) },
  spentToday
);

if (!validation.valid) {
  console.error('Transaction blocked:', validation.reason);
}
```

### Fetch.ai Integration

```typescript
import { FetchAIAgent } from '@0xgasless/agent-sdk';

const fetchAgent = new FetchAIAgent(sdk, {
  apiKey: process.env.FETCHAI_API_KEY,
  model: 'asi1-mini',
});

const result = await fetchAgent.query('Research DeFi trends on Avalanche');
console.log(result);
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Agent wallet private key |
| `RPC_URL` | No | RPC endpoint (defaults to Fuji) |
| `MOLTPAY_NETWORK` | No | Network override (`avax-fuji` or `avax-mainnet`) |
| `X402_FACILITATOR_URL` | No | Custom facilitator URL |

### Network Configuration

```typescript
import { 
  fujiConfig, 
  mainnetConfig, 
  ERC8004_V2, 
  ERC8004_V2_MAINNET 
} from '@0xgasless/agent-sdk';

// Testnet (Fuji)
const testnetSdk = new AgentSDK({
  networks: fujiConfig.networks,
  defaultNetwork: 'fuji',
  signer: wallet,
});

// Mainnet
const mainnetSdk = new AgentSDK({
  networks: mainnetConfig.networks,
  defaultNetwork: 'mainnet',
  signer: wallet,
});

// Contract addresses
console.log(ERC8004_V2);          // Fuji addresses
console.log(ERC8004_V2_MAINNET);  // Mainnet addresses
```

---

## 📁 Examples

### Basic Agent Registration

```typescript
import { ERC8004Provider } from '@0xgasless/agent-sdk';

const provider = new ERC8004Provider(
  'https://api.avax-test.network/ext/bc/C/rpc',
  process.env.PRIVATE_KEY!,
  'avax-fuji'
);

// Check registration status
const isRegistered = await provider.isRegistered();

if (!isRegistered) {
  const agentId = await provider.register('https://myagent.com/metadata.json');
  console.log('Registered with ID:', agentId);
}
```

### With Privy Wallet

```typescript
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { AgentSDK, fujiConfig } from '@0xgasless/agent-sdk';

function AgentComponent() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const initSDK = async () => {
    const wallet = wallets[0];
    const provider = await wallet.getEthersProvider();
    const signer = await provider.getSigner();

    const sdk = new AgentSDK({
      ...fujiConfig,
      signer,
    });

    return sdk;
  };
}
```

### With MetaMask

```typescript
import { BrowserProvider } from 'ethers';
import { AgentSDK, fujiConfig } from '@0xgasless/agent-sdk';

async function connectMetaMask() {
  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  const signer = await provider.getSigner();

  const sdk = new AgentSDK({
    ...fujiConfig,
    signer,
  });

  return sdk;
}
```

---

## 🔑 Wallet Support

This SDK is **completely wallet-agnostic**. Use any wallet:

| Wallet | Status | Example |
|--------|--------|---------|
| ethers.js Wallet | ✅ Supported | `new Wallet(privateKey, provider)` |
| Session Keys | ✅ Supported | `SessionKeyHelper.createWallet(...)` |
| Privy | ✅ Supported | `wallet.getEthersProvider()` |
| Dynamic.xyz | ✅ Supported | `primaryWallet.getWalletClient()` |
| MetaMask | ✅ Supported | `BrowserProvider(window.ethereum)` |
| Safe | ✅ Supported | `SafeWalletProvider` |

---

## 🛠️ Development

### Building from Source

```bash
git clone https://github.com/0xgasless/agent-sdk.git
cd agent-sdk

npm install
npm run build
npm run build:cli
```

### Running Tests

```bash
npm test
```

### Local CLI Development

```bash
# Build and link locally
npm run build:cli
node dist/cli/index.js --help
```

---

## 📄 License

MIT - see [LICENSE](./LICENSE)

---

## 🤝 Support

- 📚 [Documentation](https://docs.0xgasless.com)
- 🐛 [Issues](https://github.com/0xgasless/agent-sdk/issues)
- 🐦 [Twitter](https://twitter.com/0xgasless)

---

<div align="center">

**Built with ❤️ by [0xGasless](https://0xgasless.com)**

</div>
