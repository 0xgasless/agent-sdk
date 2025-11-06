# Updating ERC-8004 Client ABIs

The ERC-8004 clients currently use placeholder ABIs. You need to update them with the actual contract ABIs from the deployed contracts.

## Steps

1. **Extract ABIs from deployed contracts** or use the interfaces from `agent-sdk-contracts/contracts/interfaces/`

2. **Update IdentityRegistry Client** (`src/erc8004/identity.ts`):
   - Replace placeholder ABI with actual IdentityRegistry ABI
   - Key functions needed:
     - `newAgent(string domain, string agentCardURI)` - payable, returns uint256
     - `getAgent(uint256 tokenId)` - view, returns (uint256, string, address, string)
     - `resolveByDomain(string domain)` - view, returns (uint256, address, string)
     - `getAgentCount()` - view, returns uint256

3. **Update ReputationRegistry Client** (`src/erc8004/reputation.ts`):
   - Replace placeholder ABI with actual ReputationRegistry ABI
   - Key functions needed:
     - `acceptFeedback(uint256 clientId, uint256 serverId)`
     - `submitFeedback(uint256 clientId, uint256 serverId, uint8 score, bytes32 dataHash)` - returns bytes32
     - `getReputationStats(uint256 serverId)` - view, returns ReputationStats
     - `isFeedbackAuthorized(uint256 clientId, uint256 serverId)` - view

4. **Update ValidationRegistry Client** (`src/erc8004/validation.ts`):
   - Replace placeholder ABI with actual ValidationRegistry ABI
   - Key functions needed:
     - `stakeAsValidator(uint256 validatorId)` - payable
     - `validationRequest(uint256 validatorId, uint256 serverId, bytes32 dataHash)` - payable
     - `validationResponse(bytes32 dataHash, uint8 response)`
     - `getValidatorInfo(uint256 validatorId)` - view, returns ValidatorInfo
     - `getValidationRequest(bytes32 dataHash)` - view, returns Request

## Getting the ABIs

You can get the ABIs from:
1. The contract interfaces in `agent-sdk-contracts/contracts/interfaces/`
2. Snowtrace/Fuji explorer (contract verification)
3. Foundry: `forge inspect IdentityRegistry abi`

## Example: IdentityRegistry ABI

```typescript
const IDENTITY_ABI = [
  'function newAgent(string calldata agentDomain, string calldata agentCardURI) external payable returns (uint256 tokenId)',
  'function getAgent(uint256 tokenId) external view returns (uint256 agentId, string memory agentDomain, address agentAddress, string memory agentCardURI)',
  'function resolveByDomain(string calldata agentDomain) external view returns (uint256 tokenId, address agentAddress, string memory agentCardURI)',
  'function getAgentCount() external view returns (uint256 count)',
  // ... add other functions as needed
];
```

After updating the ABIs, the example in `complete-example.ts` will work with real transactions.
