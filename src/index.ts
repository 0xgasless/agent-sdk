// Core SDK
export { AgentSDK } from './AgentSDK';
export type { AgentSDKConfig } from './types';
export type { NetworkConfig, SupportedNetwork } from './types';

// Network configs
export * from './config';

// Utils (optional helpers)
export { SessionKeyHelper } from './utils/SessionKeyHelper';
export type { SessionKeyInfo, SessionKeyConstraints } from './utils/SessionKeyHelper';

// Integrations (optional)
export { FetchAIAgent } from './integrations/fetchai';
export type { FetchAIConfig, FetchAIQueryOptions, FetchAIResponse } from './integrations/fetchai';

// x402
export * from './x402/types';
export { createPaymentPayload } from './x402/wallet';
export { FacilitatorClient } from './x402/facilitatorClient';
export { x402Fetch } from './x402/httpClient';

// ERC-8004 (v0.2 - Official ERC-8004, UUPS Upgradeable)
export * from './erc8004/types';
export { IdentityRegistryClientV2 as IdentityRegistryClient } from './erc8004/identity';
export { IdentityV2 } from './erc8004/identity';
export { ReputationRegistryClientV2 as ReputationRegistryClient } from './erc8004/reputation';
export { ReputationV2 } from './erc8004/reputation';
export { ValidationRegistryClientV2 as ValidationRegistryClient, EconomicModel } from './erc8004/validation';
export { ValidationV2 } from './erc8004/validation';
export { ValidationPluginClient } from './erc8004/validationPlugin';
import IdentityRegistryABI from './erc8004/abis/IdentityRegistry.json';
import ReputationRegistryABI from './erc8004/abis/ReputationRegistry.json';
import ValidationRegistryABI from './erc8004/abis/ValidationRegistry.json';
export { IdentityRegistryABI, ReputationRegistryABI, ValidationRegistryABI };

// Fuji config with v0.2 addresses
export { 
  fujiConfig, 
  fujiNetworkConfig, 
  ERC8004_V2,
  mainnetConfig,
  mainnetNetworkConfig,
  ERC8004_V2_MAINNET,
  MAINNET_TOKENS,
  avalancheConfig,
} from './fuji-config.js';

// --- Wallet System ---
export { WalletManager } from './wallet';
export * from './wallet/types';
export { PrivyWalletProvider } from './wallet/PrivyWalletProvider';
export { SafeWalletProvider } from './wallet/SafeWalletProvider';
export { SessionKeyWalletProvider } from './wallet/SessionKeyWalletProvider';

// --- Providers ---
export { ERC8004Provider } from './providers/ERC8004Provider';
export { MoltBookProvider } from './providers/MoltBookProvider';

// --- LangChain Tools ---
export { getAgentTools, getToolsWithoutInit } from './langchain';
export { registerAgentTool, getBalanceTool, verifyMoltBookTool } from './langchain';
