/**
 * ERC-8004 v0.2 Types
 */

// Identity types
export interface AgentInfo {
  agentId: string;
  owner: string;
  agentURI: string;
  verifiedWallet?: string;
}

// Re-export types from v0.2 clients
export type { FeedbackV2 } from './reputation';
export type { ValidatorInfoV2, ValidationRequestV2, EconomicModel } from './validation';
