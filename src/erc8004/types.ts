export interface AgentProfile {
  id: string;
  domain?: string;
  owner: string;
  metadataURI?: string;
}

// Re-export types from reputation and validation clients
export type { ReputationStats, Feedback } from './reputation';
export type { ValidatorInfo, ValidationRequest } from './validation';


