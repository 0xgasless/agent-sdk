# ERC-8004 Contract ABIs

## Folder Structure

```
abis/
├── IdentityRegistry.json      # v0.1 (legacy, domain-based)
├── ReputationRegistry.json    # v0.1 (legacy)
├── ValidationRegistry.json    # v0.1 (legacy)
└── v2/
    ├── IdentityRegistry.json      # v0.2 (official ERC-8004, UUPS)
    ├── ReputationRegistry.json    # v0.2 (official, UUPS)
    ├── ValidationRegistry.json    # v0.2 (stake-based, UUPS)
    └── ValidationPlugin.json      # v0.2 (reputation checks)
```

## Which Version to Use?

| Version | Description | Use Case |
|---------|-------------|----------|
| **v0.2** | Official ERC-8004 spec, UUPS upgradeable | **Recommended** for new projects |
| v0.1 | Domain-based, non-upgradeable | Legacy support only |

## v0.2 Key Differences

| Feature | v0.1 | v0.2 |
|---------|------|------|
| Registration | Domain + URI | URI only (official spec) |
| Wallet Verification | None | EIP-712 signatures |
| Upgradeability | None | UUPS Proxy |
| Validation | Basic | Stake + Slash + Plugin |

## Deployed Addresses (Avalanche Fuji)

### v0.2 (Recommended)
```
IdentityRegistry:   0x372d406040064a9794d14f3f8fec0f2e13e5b99f
ReputationRegistry: 0x8B106121EeEC204a1EA012E8560090a85d4C5350
ValidationRegistry: 0x6ab685d73513918a5d76d90cbc089583b92f029e
ValidationPlugin:   0x6b35bEc82E5623dbc67Aa921dB10fF719C77E1fB
```

### v0.1 (Legacy)
```
IdentityRegistry:   0x96eF5c6941d5f8dfB4a39F44E9238b85F01F4d29
ReputationRegistry: 0xDC61Ea0B4DC6f156F72b62e59860303a4753033F
ValidationRegistry: 0x467363Bd781AbbABB089161780649C86F6B0271B
```

## Regenerating ABIs

To regenerate ABIs from the contracts:

```bash
cd agent-sdk-contracts

# Compile
forge build
