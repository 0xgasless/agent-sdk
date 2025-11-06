import { Contract, JsonRpcProvider, Wallet, ContractTransactionResponse } from 'ethers';
import { NetworkConfig } from '../types';
import ValidationRegistryABI from './abis/ValidationRegistry.json';

export interface ValidatorInfo {
  stakedAmount: string;
  lockedAmount: string;
  totalValidations: string;
  totalSlashed: string;
  isActive: boolean;
}

export interface ValidationRequest {
  agentValidatorId: string;
  agentServerId: string;
  dataHash: string;
  timestamp: string;
  responded: boolean;
  reward: string;
}

export class ValidationRegistryClient {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.validationRegistry) {
      throw new Error(`Validation registry not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.validationRegistry, ValidationRegistryABI, signerOrProvider as any);
  }

  /**
   * Stake ETH to become or remain an active validator
   * @param validatorId Token ID of the validator agent
   * @param overrides Optional transaction overrides (e.g., value for stake amount)
   * @returns Transaction hash
   */
  async stakeAsValidator(validatorId: string | number, overrides?: { value?: bigint }): Promise<ContractTransactionResponse> {
    const tx = await this.contract.stakeAsValidator(validatorId, overrides || {});
    return tx;
  }

  /**
   * Unstake ETH from validator stake
   * @param validatorId Token ID of the validator agent
   * @param amount Amount to unstake
   * @returns Transaction hash
   */
  async unstake(validatorId: string | number, amount: bigint): Promise<ContractTransactionResponse> {
    const tx = await this.contract.unstake(validatorId, amount);
    return tx;
  }

  /**
   * Request validation from a validator agent
   * @param validatorId Token ID of the validator agent
   * @param serverId Token ID of the server agent (must be caller)
   * @param dataHash Hash of data to validate
   * @param overrides Optional transaction overrides (e.g., value for reward)
   * @returns Transaction hash
   */
  async validationRequest(
    validatorId: string | number,
    serverId: string | number,
    dataHash: string,
    overrides?: { value?: bigint }
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.validationRequest(validatorId, serverId, dataHash, overrides || {});
    return tx;
  }

  /**
   * Submit validation response
   * @param dataHash Hash of data being validated
   * @param response Validation score (0-100)
   * @returns Transaction hash
   */
  async validationResponse(dataHash: string, response: number): Promise<ContractTransactionResponse> {
    if (response < 0 || response > 100) {
      throw new Error('Response must be between 0 and 100');
    }
    const tx = await this.contract.validationResponse(dataHash, response);
    return tx;
  }

  /**
   * Slash validator stake for non-response
   * @param validatorId Token ID of the validator agent
   * @param dataHash Hash of the expired validation request
   * @returns Transaction hash
   */
  async slashValidator(validatorId: string | number, dataHash: string): Promise<ContractTransactionResponse> {
    const tx = await this.contract.slashValidator(validatorId, dataHash);
    return tx;
  }

  /**
   * Get validation request details
   * @param dataHash Hash of the validation request
   * @returns The validation request struct
   */
  async getValidationRequest(dataHash: string): Promise<ValidationRequest> {
    const req = await this.contract.getValidationRequest(dataHash);
    return {
      agentValidatorId: req[0].toString(),
      agentServerId: req[1].toString(),
      dataHash: req[2],
      timestamp: req[3].toString(),
      responded: req[4],
      reward: req[5].toString(),
    };
  }

  /**
   * Check if validation is pending
   * @param dataHash Hash of the validation request
   * @returns Object with exists and pending flags
   */
  async isValidationPending(dataHash: string): Promise<{ exists: boolean; pending: boolean }> {
    const res = await this.contract.isValidationPending(dataHash);
    return {
      exists: res[0],
      pending: res[1],
    };
  }

  /**
   * Get validation response
   * @param dataHash Hash of the validation request
   * @returns Object with hasResponse flag and response score
   */
  async getValidationResponse(dataHash: string): Promise<{ hasResponse: boolean; response: number }> {
    const res = await this.contract.getValidationResponse(dataHash);
    return {
      hasResponse: res[0],
      response: Number(res[1]),
    };
  }

  /**
   * Get validator information
   * @param validatorId Token ID of the validator agent
   * @returns Validator information struct
   */
  async getValidatorInfo(validatorId: string | number): Promise<ValidatorInfo> {
    const info = await this.contract.getValidatorInfo(validatorId);
    return {
      stakedAmount: info[0].toString(),
      lockedAmount: info[1].toString(),
      totalValidations: info[2].toString(),
      totalSlashed: info[3].toString(),
      isActive: info[4],
    };
  }

  /**
   * Get validator's active requests
   * @param validatorId Token ID of the validator agent
   * @returns Array of active request hashes
   */
  async getValidatorActiveRequests(validatorId: string | number): Promise<string[]> {
    const requests = await this.contract.getValidatorActiveRequests(validatorId);
    return requests.map((hash: string) => hash);
  }

  /**
   * Check if validator is active
   * @param validatorId Token ID of the validator agent
   * @returns True if validator is active
   */
  async isValidatorActive(validatorId: string | number): Promise<boolean> {
    return await this.contract.isValidatorActive(validatorId);
  }

  /**
   * Get validator stake amounts
   * @param validatorId Token ID of the validator agent
   * @returns Object with staked, locked, and available amounts
   */
  async getValidatorStake(
    validatorId: string | number
  ): Promise<{ staked: string; locked: string; available: string }> {
    const res = await this.contract.getValidatorStake(validatorId);
    return {
      staked: res[0].toString(),
      locked: res[1].toString(),
      available: res[2].toString(),
    };
  }

  /**
   * Get expiration window in blocks
   * @returns Number of blocks before expiration
   */
  async getExpirationSlots(): Promise<number> {
    const slots = await this.contract.getExpirationSlots();
    return Number(slots);
  }

  /**
   * Get minimum validator stake
   * @returns Minimum stake required
   */
  async getMinValidatorStake(): Promise<string> {
    const stake = await this.contract.getMinValidatorStake();
    return stake.toString();
  }

  /**
   * Get total staked amount
   * @returns Total ETH staked by all validators
   */
  async getTotalStaked(): Promise<string> {
    const total = await this.contract.getTotalStaked();
    return total.toString();
  }

  /**
   * Get total number of validations completed
   * @returns Total validations
   */
  async getTotalValidations(): Promise<number> {
    const count = await this.contract.getTotalValidations();
    return Number(count);
  }
}
