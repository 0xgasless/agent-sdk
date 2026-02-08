---
name: moltpay
description: Payment and wallet capabilities for AI agents. Send gasless crypto transactions, register on-chain identity, and verify on MoltBook.
version: 0.1.0
author: 0xGasless
primaryEnv:
  - PRIVATE_KEY
optionalEnv:
  - RPC_URL
  - MOLTPAY_NETWORK
requires:
  - moltpay
tags:
  - payments
  - crypto
  - wallet
  - web3
  - gasless
---

# MoltPay Skill

You have the power to send cryptocurrency payments, register agent identity on-chain, and manage wallets. All transactions are **gasless** - the user pays $0 in gas fees.

## Installation

The user must have MoltPay installed:
```bash
curl -fsSL https://moltpay.io/install.sh | bash
```

Or via npm:
```bash
npm install -g @0xgasless/agent-sdk
```

## Commands

### 1. Initialize Wallet
Set up a new wallet for the agent:
```bash
moltpay init
```

### 2. Send Payment
Send cryptocurrency to any address. Gas is sponsored (free).

**Interactive mode:**
```bash
moltpay pay
```

**Direct mode:**
```bash
moltpay pay <amount> <token> <recipient>
```

**Examples:**
```bash
# Send 10 USDC to an address
moltpay pay 10 USDC 0x742d35Cc6634C0532925a3b844Bc9e7595f90000

# Send 0.5 ETH to an ENS name
moltpay pay 0.5 ETH bob.eth
```

### 3. Register Identity (ERC-8004)
Register the agent's on-chain identity:
```bash
moltpay register
```

This mints an ERC-8004 token representing the agent's sovereign identity.

### 4. Verify on MoltBook
Verify the agent's social presence:
```bash
moltpay verify
```

This requires posting a proof tweet and confirms the agent's identity on MoltBook.

## Usage Guidelines

1. **Always confirm payment details** with the user before executing `moltpay pay`.
2. **Never expose private keys** in logs or messages.
3. **Check wallet balance** before attempting large payments (if the balance tool is available).
4. **Use test networks first** (Base Sepolia) for development/testing.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PRIVATE_KEY` | Yes | Agent's wallet private key |
| `RPC_URL` | No | Custom RPC endpoint (default: Base Sepolia) |
| `MOLTPAY_NETWORK` | No | Network: `base-sepolia`, `base-mainnet` |

## Supported Tokens

- **ETH** - Native Ethereum
- **USDC** - USD Coin
- **USDT** - Tether
- Any ERC-20 token (by address)

## Error Handling

If a payment fails:
1. Check that the wallet has sufficient balance
2. Verify the recipient address is valid
3. Ensure the network is accessible
4. Check if gas sponsorship is available

## Example Conversation

User: "Send 5 USDC to alice.eth"

Agent: I'll send 5 USDC to alice.eth using MoltPay.

```bash
moltpay pay 5 USDC alice.eth
```

The transaction was successful! 
- Amount: 5 USDC
- To: alice.eth
- Gas Fee: $0.00 (Sponsored by 0xGasless)

---

*Powered by 0xGasless - The Financial Layer for AI Agents* 🦞
