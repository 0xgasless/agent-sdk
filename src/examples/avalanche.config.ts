import { AgentSDK } from '../AgentSDK';
import { AgentSDKConfig } from '../types';

// Fill these two values from your setup
const FACILITATOR_URL = 'https://YOUR-AVALANCHE-X402-FACILITATOR';
const DEFAULT_TOKEN = '0xYOUR_TOKEN_ADDRESS'; // e.g. USDC/USDT on Avalanche

// From eip712Domain() you provided:
// name: A402, version: 1, chainId: 43114, verifyingContract: 0x82b52a3dA9aE38eaaEC63ffAD29cAF379339f482

export const avalancheConfig: AgentSDKConfig = {
  privateKey: process.env.AGENT_PRIVATE_KEY,
  defaultNetwork: 'avalanche',
  networks: {
    avalanche: {
      name: 'avalanche',
      chainId: 43114,
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      erc8004: {
        // Put your deployed ERC-8004 registries here when ready
        identityRegistry: '0xIDENTITY_REGISTRY',
        reputationRegistry: '0xREPUTATION_REGISTRY',
        validationRegistry: '0xVALIDATION_REGISTRY'
      },
      x402: {
        facilitatorUrl: FACILITATOR_URL,
        defaultToken: DEFAULT_TOKEN,
        domainName: 'A402',
        domainVersion: '1'
      }
    }
  }
};

export function createAvalancheSDK() {
  return new AgentSDK(avalancheConfig);
}


