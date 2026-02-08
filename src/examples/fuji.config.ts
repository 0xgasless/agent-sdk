/**
 * Avalanche Fuji Testnet Configuration
 * 
 * ERC-8004 v0.2 Contracts (UUPS Upgradeable):
 * - IdentityRegistry: 0x372d406040064a9794d14f3f8fec0f2e13e5b99f
 * - ReputationRegistry: 0x8B106121EeEC204a1EA012E8560090a85d4C5350
 * - ValidationRegistry: 0x6ab685d73513918a5d76d90cbc089583b92f029e
 * - ValidationPlugin: 0x6b35bEc82E5623dbc67Aa921dB10fF719C77E1fB
 * 
 * x402 EIP-712 Domain:
 * - name: "A402"
 * - version: "1"
 * - chainId: 43113
 * - verifyingContract: 0x8BD697733c31293Be2327026d01aE393Ab2675C4
 */

const FACILITATOR_URL = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_X402_FACILITATOR_URL) as string)
  || process.env.X402_FACILITATOR_URL 
  || 'http://testnet.0xgasless.com';

const DEFAULT_TOKEN = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEFAULT_TOKEN) as string)
  || process.env.DEFAULT_TOKEN 
  || '0x40dAE5db31DD56F1103Dd9153bd806E00A2f07BA';

/**
 * ERC-8004 v0.2 Contract Addresses (UUPS Upgradeable)
 */
export const ERC8004_V2 = {
  identityRegistry: '0x372d406040064a9794d14f3f8fec0f2e13e5b99f',
  reputationRegistry: '0x8B106121EeEC204a1EA012E8560090a85d4C5350',
  validationRegistry: '0x6ab685d73513918a5d76d90cbc089583b92f029e',
  validationPlugin: '0x6b35bEc82E5623dbc67Aa921dB10fF719C77E1fB',
};

/**
 * Fuji Network Configuration
 */
export const fujiNetworkConfig = {
  name: 'fuji' as const,
  chainId: 43113,
  rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
  erc8004: ERC8004_V2,
  x402: {
    facilitatorUrl: FACILITATOR_URL,
    defaultToken: DEFAULT_TOKEN,
    domainName: 'A402',
    domainVersion: '1',
    verifyingContract: '0x8BD697733c31293Be2327026d01aE393Ab2675C4',
  },
};

/**
 * Full SDK config (provide signer when creating SDK)
 * 
 * Usage:
 * ```typescript
 * import { AgentSDK, fujiConfig } from 'agent-sdk';
 * import { Wallet, JsonRpcProvider } from 'ethers';
 * 
 * const provider = new JsonRpcProvider(fujiConfig.networks.fuji.rpcUrl);
 * const signer = new Wallet(process.env.PRIVATE_KEY!, provider);
 * const sdk = new AgentSDK({ ...fujiConfig, signer });
 * ```
 */
export const fujiConfig = {
  defaultNetwork: 'fuji' as const,
  networks: {
    fuji: fujiNetworkConfig,
  },
};
