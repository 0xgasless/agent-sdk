/**
 * Avalanche Network Configuration
 * 
 * ERC-8004 v0.2 Contracts (UUPS Upgradeable)
 * 
 * Fuji Testnet (Chain ID: 43113):
 * - IdentityRegistry: 0x372d406040064a9794d14f3f8fec0f2e13e5b99f
 * - ReputationRegistry: 0x8B106121EeEC204a1EA012E8560090a85d4C5350
 * - ValidationRegistry: 0x6ab685d73513918a5d76d90cbc089583b92f029e
 * - ValidationPlugin: 0x6b35bEc82E5623dbc67Aa921dB10fF719C77E1fB
 * 
 * Mainnet (Chain ID: 43114):
 * - IdentityRegistry: 0x06d49e79da8a241dd2c412bf5d22e19c619a39d1
 * - ReputationRegistry: 0x29A62d678dCc581414BB3A74dF27E99c17e60dD7
 * - ValidationRegistry: 0xa490b79113d8ef4e7c7912759a3fcaff8a58cd05
 * - ValidationPlugin: 0x83dab1f7be37c5c4b84743b72642c9651de7f12b
 */

// x402 Facilitator URLs
// Testnet: https://testnet.0xgasless.com
// Mainnet: https://x402.0xgasless.com
const TESTNET_FACILITATOR_URL = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_X402_FACILITATOR_URL) as string)
  || process.env.X402_FACILITATOR_URL 
  || 'https://testnet.0xgasless.com';
const MAINNET_FACILITATOR_URL = 'https://x402.0xgasless.com';

const DEFAULT_TOKEN = ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DEFAULT_TOKEN) as string)
  || process.env.DEFAULT_TOKEN 
  || '0x40dAE5db31DD56F1103Dd9153bd806E00A2f07BA';

// ============ Fuji Testnet ============

/**
 * ERC-8004 v0.2 Contract Addresses - Fuji Testnet
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
    facilitatorUrl: TESTNET_FACILITATOR_URL,
    defaultToken: DEFAULT_TOKEN,
    domainName: 'A402',
    domainVersion: '1',
    verifyingContract: '0x8BD697733c31293Be2327026d01aE393Ab2675C4',
  },
};

// ============ Avalanche Mainnet ============

/**
 * ERC-8004 v0.2 Contract Addresses - Avalanche Mainnet
 */
export const ERC8004_V2_MAINNET = {
  identityRegistry: '0x06d49e79da8a241dd2c412bf5d22e19c619a39d1',
  reputationRegistry: '0x29A62d678dCc581414BB3A74dF27E99c17e60dD7',
  validationRegistry: '0xa490b79113d8ef4e7c7912759a3fcaff8a58cd05',
  validationPlugin: '0x83dab1f7be37c5c4b84743b72642c9651de7f12b',
};

/**
 * Supported Payment Tokens on Avalanche Mainnet
 */
export const MAINNET_TOKENS = {
  USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',      // Native USDC (6 decimals)
  USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',      // Native USDT (6 decimals)
  'USDC.e': '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', // Bridged USDC (6 decimals)
  'USDT.e': '0xc7198437980c041c805A1EDcbA50c1Ce5db95118', // Bridged USDT (6 decimals)
};

/**
 * Mainnet Network Configuration
 */
export const mainnetNetworkConfig = {
  name: 'mainnet' as const,
  chainId: 43114,
  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
  erc8004: ERC8004_V2_MAINNET,
  x402: {
    facilitatorUrl: MAINNET_FACILITATOR_URL,
    defaultToken: MAINNET_TOKENS.USDC,
    supportedTokens: MAINNET_TOKENS,
    domainName: 'A402',
    domainVersion: '1',
    verifyingContract: '0x457Db7ceBAdaF6A043AcE833de95C46E982cEdC8', // A402 Relayer Contract on Mainnet
  },
};

// ============ SDK Config ============

/**
 * Full SDK config (provide signer when creating SDK)
 * 
 * Usage:
 * ```typescript
 * import { AgentSDK, fujiConfig } from 'agent-sdk';
 * import { Wallet, JsonRpcProvider } from 'ethers';
 * 
 * // Testnet
 * const provider = new JsonRpcProvider(fujiConfig.networks.fuji.rpcUrl);
 * const signer = new Wallet(process.env.PRIVATE_KEY!, provider);
 * const sdk = new AgentSDK({ ...fujiConfig, signer });
 * 
 * // Mainnet
 * const mainnetProvider = new JsonRpcProvider(mainnetConfig.networks.mainnet.rpcUrl);
 * const mainnetSigner = new Wallet(process.env.PRIVATE_KEY!, mainnetProvider);
 * const mainnetSdk = new AgentSDK({ ...mainnetConfig, signer: mainnetSigner });
 * ```
 */
export const fujiConfig = {
  defaultNetwork: 'fuji' as const,
  networks: {
    fuji: fujiNetworkConfig,
  },
};

export const mainnetConfig = {
  defaultNetwork: 'mainnet' as const,
  networks: {
    mainnet: mainnetNetworkConfig,
  },
};

/**
 * Combined config with both networks
 */
export const avalancheConfig = {
  defaultNetwork: 'fuji' as const,
  networks: {
    fuji: fujiNetworkConfig,
    mainnet: mainnetNetworkConfig,
  },
};
