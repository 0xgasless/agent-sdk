// Core shared types for Agent SDK (ERC-8004 + x402)

export type SupportedNetwork = string; // e.g. "bsc", "bsc-testnet", "avalanche", "base", etc.

export interface NetworkConfig {
  name: SupportedNetwork;
  chainId: number;
  rpcUrl: string;
  explorerUrl?: string;
  erc8004?: {
    identityRegistry?: string;
    reputationRegistry?: string;
    validationRegistry?: string;
    validationPlugin?: string; // v0.2 only
  };
  x402?: {
    facilitatorUrl: string;
    defaultToken?: string; // ERC20 address like USDT/USDC
    domainName?: string; // default: "B402" or facilitator-specific
    domainVersion?: string; // default: "1"
    verifyingContract?: string; // EIP-712 verifying contract address
  };
}

import { Signer, Provider } from 'ethers';
import { WalletConfig } from './wallet/types';

export interface AgentSDKConfig {
  // Network configuration
  networks: Record<string, NetworkConfig>;
  defaultNetwork?: SupportedNetwork;
  
  // PRIMARY OPTION: Wallet Configuration (for SDK to manage)
  wallet?: WalletConfig;

  // ALTERNATIVE OPTION: Bring your own signer/provider
  signer?: Signer;
  
  // Optional: Provider (or derive from signer)
  provider?: Provider;
}

// x402 Types (chain-agnostic)
export interface Authorization {
  from: string;
  to: string;
  value: string; // uint256 string
  validAfter: number; // unix seconds
  validBefore: number; // unix seconds
  nonce: string; // 0x...
}

export interface PaymentPayload {
  x402Version: 1;
  scheme: "exact";
  network: SupportedNetwork;
  token: string;
  payload: {
    authorization: Authorization;
    signature: string;
  };
}

export interface PaymentRequirements {
  scheme: "exact";
  network: SupportedNetwork;
  asset: string; // token address
  payTo: string; // recipient
  maxAmountRequired: string; // uint256 string
  maxTimeoutSeconds: number;
  description?: string;
  resource?: string;
  relayerContract: string; // verifying contract address
}

export interface VerifyResponse {
  isValid: boolean;
  payer?: string;
  invalidReason?: string;
}

export interface SettleResponse {
  success: boolean;
  transaction?: string;
  network: SupportedNetwork;
  payer?: string;
  errorReason?: string;
}


