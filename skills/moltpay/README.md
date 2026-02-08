# MoltPay Skill for OpenClaw 🦞

This folder contains the MoltPay skill for [OpenClaw](https://openclaw.ai).

## Installation

### Option 1: Copy to OpenClaw skills folder
```bash
cp -r skills/moltpay ~/.openclaw/skills/
```

### Option 2: Symlink (for development)
```bash
ln -s $(pwd)/skills/moltpay ~/.openclaw/skills/moltpay
```

## Prerequisites

1. **Install MoltPay CLI:**
   ```bash
   npm install -g @0xgasless/agent-sdk
   ```

2. **Initialize wallet:**
   ```bash
   moltpay init
   ```

3. **Set environment variable:**
   ```bash
   export PRIVATE_KEY=0x...
   ```

## Verify Installation

```bash
# Check skill is loaded
openclaw skills list | grep moltpay

# Test the skill
openclaw chat "Check my wallet balance with MoltPay"
```

## What the Agent Can Do

With MoltPay skill, your OpenClaw agent can:

- 💸 **Send payments** - Gasless crypto transfers
- 🆔 **Register identity** - ERC-8004 on-chain identity
- ✅ **Verify on MoltBook** - Social verification badge
- 💰 **Check balances** - Wallet status

## License

MIT
