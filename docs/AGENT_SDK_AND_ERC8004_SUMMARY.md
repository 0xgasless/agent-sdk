# Agent SDK (ERC-8004 + x402) and ERC-8004 Contracts – Summary

This document summarizes the new chain-agnostic Agent SDK (integrating ERC-8004 and x402) and the ERC-8004 registry contracts you provided. It also lists the minimal changes needed before production use.

## 1) Agent SDK Overview

Location: `agent-sdk/`

Goal: Provide a unified, chain-agnostic toolkit for autonomous agents that:
- Manage on-chain identity/reputation/validation via ERC-8004 registries
- Perform gasless or pay-on-request payments via x402 facilitators on any EVM chain

### Key Modules
- `src/AgentSDK.ts`
  - High-level entrypoint; wires network config, wallet, ERC-8004 registry clients and x402-aware HTTP fetch
- `src/types.ts`
  - Chain-agnostic types: `NetworkConfig`, `AgentSDKConfig`, x402 payloads (`Authorization`, `PaymentRequirements`, etc.)
- `src/config.ts`
  - `NetworkRegistry` to resolve per-network settings
- `src/x402/`
  - `facilitatorClient.ts`: Generic client for any x402 facilitator (`/verify`, `/settle`)
  - `wallet.ts`: Signs EIP-712 `TransferWithAuthorization` with dynamic domain/chainId
  - `httpClient.ts`: `x402Fetch` wrapper that auto-handles 402→verify→settle→retry
- `src/erc8004/`
  - `identity.ts`, `reputation.ts`, `validation.ts`: Lightweight clients for ERC-8004 registries (placeholder ABIs)
  - `types.ts`: Shared types for agent profiles/feedback
- `src/examples/avalanche.config.ts`
  - Ready template for Avalanche with your EIP-712 domain values (name=A402, version=1)

### How Payments Work (x402)
1. Call a paid API via `sdk.fetch(url)`
2. If it returns 402 with `paymentRequirements`, SDK:
   - Builds EIP-712 authorization and signature
   - Calls facilitator `/verify`
   - Calls facilitator `/settle` (facilitator pays gas)
   - Replays the original request with `x402-payment` header

### How ERC-8004 Works
- Use `sdk.erc8004.identity()` to register/update/resolve agents
- Use `sdk.erc8004.reputation()` to authorize feedback
- Use `sdk.erc8004.validation()` to request/respond to validations

### Example Initialization (Avalanche)
```ts
import { createAvalancheSDK } from './agent-sdk/dist/examples/avalanche.config';
const sdk = createAvalancheSDK();
```
Fill in: `FACILITATOR_URL`, `DEFAULT_TOKEN`, and your three registry addresses in `avalanche.config.ts`.

## 2) Required Configuration for Avalanche

You provided eip712Domain() on Avalanche:
- domainName: `A402`
- domainVersion: `1`
- chainId: `43114`
- verifyingContract: `0x82b52a3dA9aE38eaaEC63ffAD29cAF379339f482`

SDK network entry (already scaffolded in example):
```ts
x402: {
  facilitatorUrl: 'https://<your-facilitator>',
  defaultToken: '0x<USDC_OR_USDT_ON_AVALANCHE>',
  domainName: 'A402',
  domainVersion: '1'
}
```

Also provide:
- `erc8004.identityRegistry` = <your deployed IdentityRegistry>
- `erc8004.reputationRegistry` = <your deployed ReputationRegistry>
- `erc8004.validationRegistry` = <your deployed ValidationRegistry>

## 3) ERC-8004 Contracts Summary

Location: `erc8004contracts/`

### 3.1 IdentityRegistry.sol
- Purpose: Canonical agent identity registry; protects against spam via a registration fee
- Registration fee: `REGISTRATION_FEE = 0.005 ether` (AVAX)
- Agent IDs start at 1; id 0 = not found
- Enforces uniqueness of `agentDomain` and `agentAddress`
- `newAgent` (payable): validates fee, inputs, uniqueness; stores and emits `AgentRegistered`
- `updateAgent`: only current agent address can update; optional domain/address change with uniqueness checks; emits `AgentUpdated`
- Read helpers: `getAgent`, `resolveByDomain`, `resolveByAddress`, `getAgentCount`, `agentExists`
- Funds sent as fees are deliberately trapped (burn-by-locking)

### 3.2 ReputationRegistry.sol
- Purpose: Authorize feedback from a client agent to a server agent; server must opt-in
- Uses `identityRegistry` to verify existence
- `acceptFeedback(clientId, serverId)`: only server’s registered address can authorize; emits `AuthFeedback`
- Views: `isFeedbackAuthorized`, `getFeedbackAuthId`
- Note: Only authorizes feedback; does not store scores here
- Entropy for `feedbackAuthId` uses `block.timestamp`, `block.difficulty`, `tx.origin` (see improvements below)

### 3.3 ValidationRegistry.sol
- Purpose: Request/record a validator response (0–100) for a `dataHash` within an expiration window
- Uses `identityRegistry` to verify existence/authority
- `EXPIRATION_SLOTS = 1000` blocks
- `validationRequest(validatorId, serverId, dataHash)`: creates/refreshes request; emits `ValidationRequestEvent`
- `validationResponse(dataHash, response)`: 0–100; only designated validator’s address; emits `ValidationResponseEvent`
- Views: `getValidationRequest`, `isValidationPending`, `getValidationResponse`, `getExpirationSlots`

## 4) Minimal Changes Needed Before Production

SDK (must-do):
- Provide real ERC-8004 ABIs for your registries in `agent-sdk/src/erc8004/*.ts` (replace placeholder ABIs)
- Fill Avalanche `FACILITATOR_URL`, `DEFAULT_TOKEN`, and registry addresses in `src/examples/avalanche.config.ts`

Contracts (optional best-practices, not blockers):
- ReputationRegistry `_generateFeedbackAuthId`:
  - Replace `block.difficulty` with `block.prevrandao` (Solidity ≥0.8.20)
  - Replace `tx.origin` with `msg.sender` (still just entropy)
- IdentityRegistry: document fee policy (kept/frozen). If you plan to route fees later, add a governed withdrawal path
- Domain normalization: enforce lowercase off-chain to avoid duplicates like `Agent` vs `agent`

## 5) Validate Your Setup

- Call your facilitator `GET /list` (or `GET /`) to confirm the relayer contract and supported assets on Avalanche
- Run a small payment:
  1) `sdk.fetch(url)` → expect 402
  2) SDK signs with EIP-712 using domain { name: `A402`, version: `1`, chainId: `43114`, verifyingContract }
  3) `/verify` → `isValid: true`
  4) `/settle` → success, returns transaction hash
  5) SDK retries the original request with `x402-payment`

If `/verify` returns `Invalid signature`, re-check domain name/version, chainId, relayer address, or token address.

## 6) Next Steps

- Provide the Avalanche facilitator URL, default token and the three ERC-8004 addresses → I will hardcode them into `avalanche.config.ts`
- Share ABIs (or explorer links) for the ERC-8004 registries → I will replace the placeholder ABIs in the SDK
- I can add a Fuji config alongside Mainnet if you want staged rollout


