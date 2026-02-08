---
name: Agent Economy Skill
description: Gives the agent a wallet (Coinbase/0xGasless) and identity (ERC-8004) to perform financial transactions.
authors: [ercx402]
repository: https://github.com/ercx402/agent-sdk
version: 0.1.0
install:
  node: "@ercx402/agent-sdk"
requires:
  bins: ["moltpay"]
---

# Agent Economy Skill (MoltPay)

This skill allows you to manage your identity, reputation, and finances on-chain using MoltPay.

## Tools

### 1. Register Identity
If the user asks you to "register yourself", "get verified", or "join the blockchain":
Run: `moltpay register`
This will interactively register your identity on the ERC-8004 registry.

### 2. Send Payments
If the user asks you to "pay", "send money", or "transfer crypto":
Run: `moltpay pay <amount> <token> <recipient>`

**Examples:**
- "Pay 10 USDC to bob.eth" -> `moltpay pay 10 USDC bob.eth`
- "Send 0.01 ETH to 0x123..." -> `moltpay pay 0.01 ETH 0x123...`

### 3. Social Verification (MoltBook)
If the user asks about "MoltBook", "social verification", or "claiming profile":
Run: `moltpay verify`
This will check your status and help you generate the proof tweet.

## Notes
- Ensure you have run `moltpay init` once to set up your wallet.
- Always confirm the amount and recipient with the user before running the `pay` command.
