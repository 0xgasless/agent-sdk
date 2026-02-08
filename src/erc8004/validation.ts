import { Contract, JsonRpcProvider, Wallet, ContractTransactionResponse } from 'ethers';
import { NetworkConfig } from '../types';
import ValidationRegistryABI from './abis/ValidationRegistry.json';

/**
 * Economic models for v0.2 validators
 */
export enum EconomicModel {
  STAKE_BASED = 0,
  REPUTATION_BASED = 1,
  HYBRID = 2,
  PERMISSIONLESS = 3,
}

/**
 * Validator info for v0.2
 */
/**
 * Validator info for v0.2
 */
export interface ValidatorInfoV2 {
  stakedAmount: string;
  lockedAmount: string;
  totalValidations: number;
  totalSlashed: string;
  isActive: boolean;
  // economicModel removed as it's not in the ABI
}

/**
 * Validation request for v0.2
 */
export interface ValidationRequestV2 {
  agentValidatorId: string;
  agentServerId: string;
  dataHash: string;
  timestamp: string;
  responded: boolean;
  reward: string;
}

/**
 * v0.2 Validation Registry Client
 * Uses stake-based validation with slashing (UUPS upgradeable)
 */
export class ValidationRegistryClientV2 {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.validationRegistry) {
      throw new Error(`Validation registry not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.validationRegistry, ValidationRegistryABI, signerOrProvider as any);
  }

  /**
   * Stake as a validator (official ERC-8004 interface)
   * @param validatorId Token ID of the validator agent
   * @param overrides Transaction overrides (value = stake amount)
   * @returns Transaction response
   */
  async stakeAsValidator(
    validatorId: string | number,
    overrides?: { value?: bigint }
  ): Promise<ContractTransactionResponse> {
    // ABI: stakeAsValidator(uint256 validatorId)
    const tx = await this.contract.stakeAsValidator(validatorId, overrides || {});
    return tx;
  }

  /**
   * Unstake from validator
   * @param validatorId Token ID of the validator agent
   * @param amount Amount to unstake
   * @returns Transaction response
   */
  async unstake(validatorId: string | number, amount: bigint): Promise<ContractTransactionResponse> {
    const tx = await this.contract.unstake(validatorId, amount);
    return tx;
  }

  /**
   * Create a validation request
   * @param validatorId Token ID of the validator
   * @param agentId Token ID of the agent to validate (server)
   * @param dataHash Hash of the data to validate
   * @param overrides Transaction overrides (value = reward)
   * @returns Transaction response
   */
  async requestValidation(
    validatorId: string | number,
    agentId: string | number,
    dataHash: string,
    overrides?: { value?: bigint }
  ): Promise<ContractTransactionResponse> {
    // ABI: validationRequest(uint256 agentValidatorId, uint256 agentServerId, bytes32 dataHash)
    const tx = await this.contract.validationRequest(validatorId, agentId, dataHash, overrides || {});
    return tx;
  }

  /**
   * Submit validation response
   * @param dataHash The hash of the data being validated (acts as request ID)
   * @param score Validation score/response (uint8)
   * @returns Transaction response
   */
  async validationResponse(
    dataHash: string,
    score: number
  ): Promise<ContractTransactionResponse> {
    // ABI: validationResponse(bytes32 dataHash, uint8 response)
    const tx = await this.contract.validationResponse(dataHash, score);
    return tx;
  }

  /**
   * Slash validator for non-response
   * @param validatorId Token ID of the validator
   * @param dataHash The data hash of the expired request
   * @returns Transaction response
   */
  async slashValidator(validatorId: string | number, dataHash: string): Promise<ContractTransactionResponse> {
    const tx = await this.contract.slashValidator(validatorId, dataHash);
    return tx;
  }

  /**
   * Get validator information
   * @param validatorId Token ID of the validator
   * @returns Validator info
   */
  async getValidatorInfo(validatorId: string | number): Promise<ValidatorInfoV2> {
    const info = await this.contract.getValidatorInfo(validatorId);
    return {
      stakedAmount: info[0].toString(),
      lockedAmount: info[1].toString(),
      totalValidations: Number(info[2]),
      totalSlashed: info[3].toString(),
      isActive: info[4],
    };
  }

  /**
   * Get validation request details
   * @param dataHash The data hash
   * @returns Request details
   */
  async getValidationRequest(dataHash: string): Promise<ValidationRequestV2> {
    const req = await this.contract.getValidationRequest(dataHash);
    // ABI return: tuple(uint256 agentValidatorId, uint256 agentServerId, bytes32 dataHash, uint256 timestamp, bool responded, uint256 reward)
    // Note: The structure returned by ethers might vary (array or object)
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
   * @param dataHash The data hash
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
   * @param dataHash The data hash
   * @returns Response details
   */
  async getValidationResponse(dataHash: string): Promise<{ hasResponse: boolean; response: number }> {
    const res = await this.contract.getValidationResponse(dataHash);
    return {
      hasResponse: res[0],
      response: Number(res[1]),
    };
  }

  /**
   * Get minimum validator stake
   * @returns Minimum stake in wei
   */
  async getMinValidatorStake(): Promise<string> {
    // ABI: MIN_VALIDATOR_STAKE() view returns (uint256)
    // Note: The ABI shows MIN_VALIDATOR_STAKE (caps) and getMinValidatorStake (pure).
    // Reviewing ABI... line 80: getMinValidatorStake. line 41: MIN_VALIDATOR_STAKE.
    // Let's use getMinValidatorStake as it's a standard getter pattern
    const stake = await this.contract.getMinValidatorStake();
    return stake.toString();
  }

  /**
   * Get slash percentage
   * @returns Slash percentage (0-100)
   */
  async getSlashPercentage(): Promise<number> {
    // ABI: SLASH_PERCENTAGE() view returns (uint256)
    // Does ABI have getSlashPercentage? No.
    // It has SLASH_PERCENTAGE.
    const pct = await this.contract.SLASH_PERCENTAGE();
    return Number(pct);
  }

  /**
   * Get expiration blocks
   * @returns Number of blocks/slots before request expires
   */
  async getExpirationSlots(): Promise<number> {
    // ABI: getExpirationSlots
    const slots = await this.contract.getExpirationSlots();
    return Number(slots);
  }

  /**
   * Get the raw contract instance for advanced usage
   */
  getContract(): Contract {
    return this.contract;
  }
}

// Re-export for convenience
export { ValidationRegistryClientV2 as ValidationV2 };
