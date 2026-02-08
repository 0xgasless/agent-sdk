import { Contract, JsonRpcProvider, Wallet } from 'ethers';
import { NetworkConfig } from '../types';
import ValidationPluginABI from './abis/ValidationPlugin.json';

/**
 * Validation Plugin Client
 * Handles validator eligibility checks and scoring configuration
 */
export class ValidationPluginClient {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.validationPlugin) {
      throw new Error(`Validation plugin not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.validationPlugin, ValidationPluginABI, signerOrProvider as any);
  }

  /**
   * Check if a validator meets eligibility requirements
   * @param validatorId Token ID of the validator
   * @returns Eligibility result including score and confidence
   */
  async checkValidatorEligibility(validatorId: string | number): Promise<{
    meetsRequirements: boolean;
    score: bigint;
    confidence: bigint;
    feedbackCount: bigint;
    effectiveScore: bigint;
  }> {
    const res = await this.contract.checkValidatorEligibility(validatorId);
    return {
      meetsRequirements: res[0],
      score: res[1],
      confidence: res[2],
      feedbackCount: res[3],
      effectiveScore: res[4],
    };
  }

  /**
   * Get minimum requirements configuration
   */
  async getConfiguration(): Promise<{
    minScore: bigint;
    minCount: bigint;
    minConfidence: bigint;
    reputationCheckEnabled: boolean;
    rewardMultiplierEnabled: boolean;
  }> {
    const res = await this.contract.getConfiguration();
    return {
      minScore: res[0],
      minCount: res[1],
      minConfidence: res[2],
      reputationCheckEnabled: res[3],
      rewardMultiplierEnabled: res[4],
    };
  }

  /**
   * Calculate reward multiplier for a given score
   * @param requestId Request ID
   * @param score Validation score (uint8)
   * @returns Multiplier in basis points (10000 = 1x)
   */
  async calculateReward(requestId: string, score: number): Promise<bigint> {
    const multiplier = await this.contract.calculateReward(requestId, score);
    return multiplier;
  }

  /**
   * Get multiplier for a specific score
   * @param score Validation score (0-100)
   * @returns Multiplier in basis points
   */
  async getMultiplierForScore(score: number): Promise<bigint> {
    return await this.contract.getMultiplierForScore(score);
  }

  /**
   * Get all score thresholds and their multipliers
   */
  async getAllMultipliers(): Promise<{
    thresholds: bigint[];
    multipliers: bigint[];
  }> {
    const res = await this.contract.getAllMultipliers();
    return {
      thresholds: res[0],
      multipliers: res[1],
    };
  }

  /**
   * Get plugin version
   */
  async getVersion(): Promise<string> {
    return await this.contract.version();
  }

  /**
   * Get the raw contract instance
   */
  getContract(): Contract {
    return this.contract;
  }
}
