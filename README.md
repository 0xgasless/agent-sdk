# Agent SDK (ERC-8004 + x402)

A universal, chain-agnostic TypeScript SDK for building trustless blockchain agents.

**0xgasless/agent-sdk** provides a powerful toolkit for developers looking to integrate the latest standards in agent identity, reputation management, and validation (ERC-8004), combined with seamless, gasless payments via the x402 protocol.

## About

The Agent SDK abstracts the complexities of agent management and value transfer—making it easy to build, register, and empower autonomous agents that can securely interact, prove credentials, and transact across EVM-based blockchains.

**Key highlights:**
- **Agent Identity & Trust:** Leverage ERC-8004 registries to assign, verify, and manage unique agent identities, reputation scores, and validation attributes.
- **Gasless Payments:** Integrate x402 protocol for crypto payments routed via third-party facilitators, letting agents interact with paywalled APIs and services with no up-front gas costs.
- **Chain Agnostic:** Works on any EVM-compatible network—just provide the network configuration.
- **Pluggable & Extensible:** Easily swap out network, registry, or facilitator configs without changing your code.

## Features

- **ERC-8004 Identity Registry:** Register, update, and verify agent credentials and reputation.
- **Validation Workflows:** Use standardized validation flows for agent actions and claims.
- **x402 Payment Integration:** Make payments to supported APIs and on-chain services using the x402 facilitator network.
- **Unified API Interface:** All interactions via a single, strongly-typed TypeScript SDK.

## Install

```bash
cd agent-sdk
npm install
npm run build
