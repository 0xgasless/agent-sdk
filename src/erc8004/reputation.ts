import { Contract, JsonRpcProvider, Wallet, ContractTransactionResponse } from 'ethers';
import { NetworkConfig } from '../types';
import ReputationRegistryABI from './abis/ReputationRegistry.json';

export interface ReputationStats {
  totalFeedback: string;
  averageScore: string;
  totalScore: string;
  lastUpdated: string;
}

export interface Feedback {
  clientId: string;
  serverId: string;
  score: number;
  dataHash: string;
  timestamp: string;
  exists: boolean;
}

export class ReputationRegistryClient {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.reputationRegistry) {
      throw new Error(`Reputation registry not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.reputationRegistry, ReputationRegistryABI, signerOrProvider as any);
  }

  /**
   * Server agent authorizes a client agent to submit feedback
   * @param clientId Token ID of the client agent
   * @param serverId Token ID of the server agent (must be caller)
   * @returns Transaction hash
   */
  async acceptFeedback(clientId: string | number, serverId: string | number): Promise<ContractTransactionResponse> {
    const tx = await this.contract.acceptFeedback(clientId, serverId);
    return tx;
  }

  /**
   * Server agent revokes feedback authorization
   * @param clientId Token ID of the client agent
   * @param serverId Token ID of the server agent (must be caller)
   * @returns Transaction hash
   */
  async revokeFeedback(clientId: string | number, serverId: string | number): Promise<ContractTransactionResponse> {
    const tx = await this.contract.revokeFeedback(clientId, serverId);
    return tx;
  }

  /**
   * Client agent submits feedback for a server agent
   * @param clientId Token ID of the client agent (must be caller)
   * @param serverId Token ID of the server agent
   * @param score Score from 0-100
   * @param dataHash Hash of detailed feedback (IPFS CID, etc.)
   * @returns Feedback ID
   */
  async submitFeedback(
    clientId: string | number,
    serverId: string | number,
    score: number,
    dataHash: string
  ): Promise<string> {
    if (score < 0 || score > 100) {
      throw new Error('Score must be between 0 and 100');
    }
    const tx = await this.contract.submitFeedback(clientId, serverId, score, dataHash);
    const receipt = await tx.wait();
    // Extract feedback ID from events
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'FeedbackSubmitted';
      } catch {
        return false;
      }
    });
    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      return parsed?.args[2]?.toString() || tx.hash;
    }
    return tx.hash;
  }

  /**
   * Check if feedback is authorized
   * @param clientId Token ID of the client agent
   * @param serverId Token ID of the server agent
   * @returns Object with isAuthorized flag and feedbackAuthId
   */
  async isFeedbackAuthorized(
    clientId: string | number,
    serverId: string | number
  ): Promise<{ isAuthorized: boolean; feedbackAuthId: string }> {
    const res = await this.contract.isFeedbackAuthorized(clientId, serverId);
    return {
      isAuthorized: res[0],
      feedbackAuthId: res[1],
    };
  }

  /**
   * Get feedback authorization ID
   * @param clientId Token ID of the client agent
   * @param serverId Token ID of the server agent
   * @returns The authorization ID (bytes32(0) if not authorized)
   */
  async getFeedbackAuthId(clientId: string | number, serverId: string | number): Promise<string> {
    return await this.contract.getFeedbackAuthId(clientId, serverId);
  }

  /**
   * Check if client has already submitted feedback
   * @param clientId Token ID of the client agent
   * @param serverId Token ID of the server agent
   * @returns True if feedback already submitted
   */
  async hasFeedbackBeenSubmitted(clientId: string | number, serverId: string | number): Promise<boolean> {
    return await this.contract.hasFeedbackBeenSubmitted(clientId, serverId);
  }

  /**
   * Get a specific feedback entry
   * @param feedbackId The unique feedback identifier
   * @returns The feedback struct
   */
  async getFeedback(feedbackId: string): Promise<Feedback> {
    const res = await this.contract.getFeedback(feedbackId);
    return {
      clientId: res[0].toString(),
      serverId: res[1].toString(),
      score: Number(res[2]),
      dataHash: res[3],
      timestamp: res[4].toString(),
      exists: res[5],
    };
  }

  /**
   * Get all feedback IDs for a server agent
   * @param serverId Token ID of the server agent
   * @returns Array of feedback IDs
   */
  async getServerFeedbackIds(serverId: string | number): Promise<string[]> {
    const ids = await this.contract.getServerFeedbackIds(serverId);
    return ids.map((id: string) => id);
  }

  /**
   * Get all feedback entries for a server agent
   * @param serverId Token ID of the server agent
   * @returns Array of feedback structs
   */
  async getServerFeedbacks(serverId: string | number): Promise<Feedback[]> {
    const feedbacks = await this.contract.getServerFeedbacks(serverId);
    return feedbacks.map((f: any) => ({
      clientId: f[0].toString(),
      serverId: f[1].toString(),
      score: Number(f[2]),
      dataHash: f[3],
      timestamp: f[4].toString(),
      exists: f[5],
    }));
  }

  /**
   * Get paginated feedback for a server agent
   * @param serverId Token ID of the server agent
   * @param offset Starting index
   * @param limit Number of entries to return
   * @returns Object with feedbacks array and total count
   */
  async getServerFeedbacksPaginated(
    serverId: string | number,
    offset: number,
    limit: number
  ): Promise<{ feedbacks: Feedback[]; total: number }> {
    const res = await this.contract.getServerFeedbacksPaginated(serverId, offset, limit);
    return {
      feedbacks: res[0].map((f: any) => ({
        clientId: f[0].toString(),
        serverId: f[1].toString(),
        score: Number(f[2]),
        dataHash: f[3],
        timestamp: f[4].toString(),
        exists: f[5],
      })),
      total: Number(res[1]),
    };
  }

  /**
   * Get reputation statistics for a server agent
   * @param serverId Token ID of the server agent
   * @returns Aggregated reputation statistics
   */
  async getReputationStats(serverId: string | number): Promise<ReputationStats> {
    const stats = await this.contract.getReputationStats(serverId);
    return {
      totalFeedback: stats[0].toString(),
      averageScore: stats[1].toString(),
      totalScore: stats[2].toString(),
      lastUpdated: stats[3].toString(),
    };
  }

  /**
   * Get average reputation score for a server agent
   * @param serverId Token ID of the server agent
   * @returns Object with averageScore and feedbackCount
   */
  async getAverageScore(serverId: string | number): Promise<{ averageScore: number; feedbackCount: number }> {
    const res = await this.contract.getAverageScore(serverId);
    return {
      averageScore: Number(res[0]),
      feedbackCount: Number(res[1]),
    };
  }

  /**
   * Get reputation score with confidence level
   * @param serverId Token ID of the server agent
   * @returns Object with score, confidence, and feedbackCount
   */
  async getScoreWithConfidence(
    serverId: string | number
  ): Promise<{ score: number; confidence: number; feedbackCount: number }> {
    const res = await this.contract.getScoreWithConfidence(serverId);
    return {
      score: Number(res[0]),
      confidence: Number(res[1]),
      feedbackCount: Number(res[2]),
    };
  }

  /**
   * Get total feedback count across all agents
   * @returns Total number of feedback entries
   */
  async getTotalFeedbackCount(): Promise<number> {
    const count = await this.contract.getTotalFeedbackCount();
    return Number(count);
  }
}
