import { AgentSDK } from '../AgentSDK';
import { AgentSDKConfig } from '../types';

/**
 * Avalanche Fuji Testnet Configuration
 * 
 * Deployed ERC-8004 Contracts:
 * - IdentityRegistry: 0x96eF5c6941d5f8dfB4a39F44E9238b85F01F4d29
 * - ReputationRegistry: 0xDC61Ea0B4DC6f156F72b62e59860303a4753033F
 * - ValidationRegistry: 0x467363Bd781AbbABB089161780649C86F6B0271B
 * 
 * x402 EIP-712 Domain:
 * - name: "A402"
 * - version: "1"
 * - chainId: 43113
 * - verifyingContract: 0x8BD697733c31293Be2327026d01aE393Ab2675C4 (deployed and working on Fuji testnet)
 * 
 * ✅ Relayer contract is deployed and working!
 * Note: The facilitator's /health endpoint may show a different address, but verification works.
 * Settlement may fail if the facilitator's internal relayer address doesn't match.
 */

// Load .env file if it exists
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not installed, skip
}

// Facilitator URL from environment or default to testnet facilitator
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'http://testnet.0xgasless.com';

// Use token from facilitator /list endpoint (USDT on Fuji testnet)
// Note: The facilitator shows 0x9e9ab4D5e5e7D7E7E5e5E5E5E5E5E5E5E5E5E5E5 which might be a placeholder
// Override with DEFAULT_TOKEN env var if you have a different token address
const DEFAULT_TOKEN = process.env.DEFAULT_TOKEN || '0x40dAE5db31DD56F1103Dd9153bd806E00A2f07BA'; // USDT from facilitator /list

export const fujiConfig: AgentSDKConfig = {
  privateKey: process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || undefined,
  defaultNetwork: 'fuji',
  networks: {
    fuji: {
      name: 'fuji',
      chainId: 43113,
      rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
      erc8004: {
        identityRegistry: '0x96eF5c6941d5f8dfB4a39F44E9238b85F01F4d29',
        reputationRegistry: '0xDC61Ea0B4DC6f156F72b62e59860303a4753033F',
        validationRegistry: '0x467363Bd781AbbABB089161780649C86F6B0271B',
      },
      x402: {
        facilitatorUrl: FACILITATOR_URL,
        defaultToken: DEFAULT_TOKEN,
        domainName: 'A402',
        domainVersion: '1',
        verifyingContract: '0x8BD697733c31293Be2327026d01aE393Ab2675C4', // Relayer from facilitator /health endpoint (active relayer)
      },
    },
  },
};

export function createFujiSDK() {
  return new AgentSDK(fujiConfig);
}

