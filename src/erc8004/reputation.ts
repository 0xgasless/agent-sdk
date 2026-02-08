import { Contract, JsonRpcProvider, Wallet, ContractTransactionResponse } from 'ethers';
import { NetworkConfig } from '../types';
import ReputationRegistryABI from './abis/ReputationRegistry.json';

/**
 * Feedback entry for v0.2 (official ERC-8004)
 */
export interface FeedbackV2 {
  value: bigint;
  valueDecimals: number;
  tag1: string;
  tag2: string;
  endpoint: string;
  feedbackURI: string;
  feedbackHash: string;
  isRevoked: boolean;
}

/**
 * v0.2 Reputation Registry Client
 * Uses official ERC-8004 interface (UUPS upgradeable)
 */
export class ReputationRegistryClientV2 {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.reputationRegistry) {
      throw new Error(`Reputation registry not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.reputationRegistry, ReputationRegistryABI, signerOrProvider as any);
  }

  /**
   * Give feedback for an agent (official ERC-8004 interface)
   * @param agentId Token ID of the agent
   * @param value Feedback value (signed fixed-point)
   * @param valueDecimals Decimals for the value
   * @param tag1 Optional tag for filtering
   * @param tag2 Optional tag for filtering
   * @param endpoint Optional endpoint
   * @param feedbackURI URI to detailed feedback
   * @param feedbackHash Hash of the feedback data
   * @returns Transaction response
   */
  async giveFeedback(
    agentId: string | number,
    value: bigint,
    valueDecimals: number,
    tag1: string = '',
    tag2: string = '',
    endpoint: string = '',
    feedbackURI: string = '',
    feedbackHash: string = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.giveFeedback(
      agentId,
      value,
      valueDecimals,
      tag1,
      tag2,
      endpoint,
      feedbackURI,
      feedbackHash
    );
    return tx;
  }

  /**
   * Revoke feedback
   * @param agentId Token ID of the agent
   * @param feedbackIndex Index of the feedback to revoke
   * @returns Transaction response
   */
  async revokeFeedback(
    agentId: string | number,
    feedbackIndex: number
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.revokeFeedback(agentId, feedbackIndex);
    return tx;
  }

  /**
   * Append response to feedback
   * @param agentId Token ID of the agent
   * @param clientAddress Address of the feedback giver
   * @param feedbackIndex Index of the feedback
   * @param responseURI URI to the response
   * @param responseHash Hash of the response data
   * @returns Transaction response
   */
  async appendResponse(
    agentId: string | number,
    clientAddress: string,
    feedbackIndex: number,
    responseURI: string,
    responseHash: string
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.appendResponse(
      agentId,
      clientAddress,
      feedbackIndex,
      responseURI,
      responseHash
    );
    return tx;
  }

  /**
   * Read a specific feedback entry
   * @param agentId Token ID of the agent
   * @param clientAddress Address of the feedback giver
   * @param feedbackIndex Index of the feedback
   * @returns Feedback data
   */
  async readFeedback(
    agentId: string | number,
    clientAddress: string,
    feedbackIndex: number
  ): Promise<{ value: bigint; valueDecimals: number; tag1: string; tag2: string; isRevoked: boolean }> {
    const res = await this.contract.readFeedback(agentId, clientAddress, feedbackIndex);
    return {
      value: res[0],
      valueDecimals: Number(res[1]),
      tag1: res[2],
      tag2: res[3],
      isRevoked: res[4],
    };
  }

  /**
   * Get aggregated summary for an agent
   * @param agentId Token ID of the agent
   * @param clientAddresses Array of client addresses to include
   * @param tag1 Filter by tag1
   * @param tag2 Filter by tag2
   * @returns Summary with count, value sum, and decimals
   */
  async getSummary(
    agentId: string | number,
    clientAddresses: string[] = [],
    tag1: string = '',
    tag2: string = ''
  ): Promise<{ count: number; summaryValue: bigint; summaryValueDecimals: number }> {
    const res = await this.contract.getSummary(agentId, clientAddresses, tag1, tag2);
    return {
      count: Number(res[0]),
      summaryValue: res[1],
      summaryValueDecimals: Number(res[2]),
    };
  }

  /**
   * Get the Identity Registry address
   * @returns The Identity Registry contract address
   */
  async getIdentityRegistry(): Promise<string> {
    return await this.contract.getIdentityRegistry();
  }

  /**
   * Get the last feedback index for a specific client
   * @param agentId Token ID of the agent
   * @param clientAddress Address of the client
   * @returns Last feedback index (0 if none)
   */
  async getLastIndex(agentId: string | number, clientAddress: string): Promise<bigint> {
    return await this.contract.getLastIndex(agentId, clientAddress);
  }

  /**
   * Read all feedback matching criteria
   * @param agentId Token ID of the agent
   * @param clientAddresses List of clients (empty for all known clients)
   * @param tag1 Filter by tag1
   * @param tag2 Filter by tag2
   * @param includeRevoked Include revoked feedback
   * @returns Arrays of feedback data
   */
  async readAllFeedback(
    agentId: string | number,
    clientAddresses: string[] = [],
    tag1: string = '',
    tag2: string = '',
    includeRevoked: boolean = false
  ): Promise<{
    clients: string[];
    feedbackIndexes: bigint[];
    values: bigint[];
    valueDecimals: number[];
    tag1s: string[];
    tag2s: string[];
    revokedStatuses: boolean[];
  }> {
    const res = await this.contract.readAllFeedback(
      agentId,
      clientAddresses,
      tag1,
      tag2,
      includeRevoked
    );
    return {
      clients: res[0],
      feedbackIndexes: res[1],
      values: res[2],
      valueDecimals: res[3].map(Number),
      tag1s: res[4],
      tag2s: res[5],
      revokedStatuses: res[6],
    };
  }

  /**
   * Get response count for a feedback
   * @param agentId Token ID of the agent
   * @param clientAddress Address of the client (0x0 for all)
   * @param feedbackIndex Index of the feedback (0 for all)
   * @param responders Filter by specific responders
   * @returns Count of responses
   */
  async getResponseCount(
    agentId: string | number,
    clientAddress: string = '0x0000000000000000000000000000000000000000',
    feedbackIndex: number = 0,
    responders: string[] = []
  ): Promise<bigint> {
    return await this.contract.getResponseCount(agentId, clientAddress, feedbackIndex, responders);
  }

  /**
   * Get all clients who have given feedback to an agent
   * @param agentId Token ID of the agent
   * @returns Array of client addresses
   */
  async getClients(agentId: string | number): Promise<string[]> {
    return await this.contract.getClients(agentId);
  }

  /**
   * Get contract version
   */
  async getVersion(): Promise<string> {
    return await this.contract.getVersion();
  }

  /**
   * Get the raw contract instance for advanced usage
   */
  getContract(): Contract {
    return this.contract;
  }
}

// Re-export for convenience
export { ReputationRegistryClientV2 as ReputationV2 };
