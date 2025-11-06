# AgentSDK Examples

This directory contains example configurations and usage patterns for the AgentSDK.

## Files

- **`fuji.config.ts`** - Configuration for Avalanche Fuji testnet with deployed contract addresses
- **`complete-example.ts`** - Comprehensive example showing all SDK features
- **`avalanche.config.ts`** - Configuration template for Avalanche mainnet

## Quick Start

### 1. Set Environment Variables

```bash
export PRIVATE_KEY=your_private_key_here
export X402_FACILITATOR_URL=https://your-facilitator-url.com
export DEFAULT_TOKEN=0x5425890298aed601595a70AB815c96711a31Bc65  # USDC.e on Fuji
```

### 2. Update ERC-8004 Client ABIs

The ERC-8004 clients currently use placeholder ABIs. You need to update them with the actual contract ABIs:

- `src/erc8004/identity.ts` - Update with IdentityRegistry ABI
- `src/erc8004/reputation.ts` - Update with ReputationRegistry ABI  
- `src/erc8004/validation.ts` - Update with ValidationRegistry ABI

You can extract the ABIs from the deployed contracts or use the interfaces from `agent-sdk-contracts/contracts/interfaces/`.

### 3. Run the Example

```bash
cd agent-sdk
npm install
npx ts-node src/examples/complete-example.ts
```

## Deployed Contracts (Fuji Testnet)

- **IdentityRegistry**: `0x96eF5c6941d5f8dfB4a39F44E9238b85F01F4d29`
- **ReputationRegistry**: `0xDC61Ea0B4DC6f156F72b62e59860303a4753033F`
- **ValidationRegistry**: `0x467363Bd781AbbABB089161780649C86F6B0271B`

## x402 Configuration

The x402 EIP-712 domain for Avalanche:
- **name**: "A402"
- **version**: "1"
- **chainId**: 43113 (Fuji) or 43114 (Mainnet)
- **verifyingContract**: `0x82b52a3dA9aE38eaaEC63ffAD29cAF379339f482`

## Features Demonstrated

1. **Agent Registration** - Register an agent with ERC-8004 Identity Registry
2. **Gasless Payments** - Make payments using x402 protocol
3. **Reputation** - Submit and manage feedback
4. **Validation** - Stake as validator and handle validation requests
5. **HTTP Requests** - Use x402Fetch for gasless API calls

## Next Steps

1. Update the ABIs in the ERC-8004 clients
2. Set up or connect to an x402 facilitator
3. Deploy or use an existing x402 relayer contract
4. Test with real transactions on Fuji testnet
5. Deploy to mainnet when ready

