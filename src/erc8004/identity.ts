import { Contract, JsonRpcProvider, Wallet, ContractTransactionResponse } from 'ethers';
import { NetworkConfig } from '../types';
import { AgentProfile } from './types';
import IdentityRegistryABI from './abis/IdentityRegistry.json';

export class IdentityRegistryClient {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.identityRegistry) {
      throw new Error(`Identity registry not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.identityRegistry, IdentityRegistryABI, signerOrProvider as any);
  }

  /**
   * Register a new agent
   * @param domain Unique domain identifier for the agent
   * @param agentCardURI URI pointing to the Agent Card JSON (IPFS, Arweave, etc.)
   * @param overrides Optional transaction overrides (e.g., value for registration fee)
   * @returns Transaction hash
   */
  async newAgent(
    domain: string,
    agentCardURI: string,
    overrides?: { value?: bigint }
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.newAgent(domain, agentCardURI, {
      value: overrides?.value || BigInt('5000000000000000'), // 0.005 AVAX default
      ...overrides,
    });
    return tx;
  }

  /**
   * Get agent information by token ID
   * @param tokenId The token ID to query
   * @returns Agent information or null if not found
   */
  async getAgent(tokenId: string | number): Promise<AgentProfile | null> {
    try {
      const res = await this.contract.getAgent(tokenId);
      return {
        id: res[0].toString(),
        domain: res[1],
        owner: res[2],
        metadataURI: res[3],
      } as AgentProfile;
    } catch (error: any) {
      if (error.message?.includes('AgentNotFound') || error.message?.includes('ERC721NonexistentToken')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Resolve agent by domain name
   * @param domain The domain to look up
   * @returns Agent information or null if not found
   */
  async resolveByDomain(domain: string): Promise<{ tokenId: string; owner: string; agentCardURI: string } | null> {
    try {
      const res = await this.contract.resolveByDomain(domain);
      return {
        tokenId: res[0].toString(),
        owner: res[1],
        agentCardURI: res[2],
      };
    } catch (error: any) {
      if (error.message?.includes('AgentNotFound')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Resolve agents by owner address
   * @param address The address to look up
   * @returns Array of token IDs owned by this address
   */
  async resolveByAddress(address: string): Promise<string[]> {
    const tokenIds = await this.contract.resolveByAddress(address);
    return tokenIds.map((id: bigint) => id.toString());
  }

  /**
   * Get total number of registered agents
   * @returns Total agent count
   */
  async getAgentCount(): Promise<number> {
    const count = await this.contract.getAgentCount();
    return Number(count);
  }

  /**
   * Check if an agent exists
   * @param tokenId The token ID to check
   * @returns True if the agent exists
   */
  async agentExists(tokenId: string | number): Promise<boolean> {
    return await this.contract.agentExists(tokenId);
  }

  /**
   * Check if a domain is available
   * @param domain The domain to check
   * @returns True if domain can be registered
   */
  async isDomainAvailable(domain: string): Promise<boolean> {
    return await this.contract.isDomainAvailable(domain);
  }

  /**
   * Update an existing agent's metadata and/or domain
   * @param tokenId The token ID of the agent to update
   * @param newDomain New domain (empty string to keep current)
   * @param newAgentCardURI New Agent Card URI (empty string to keep current)
   * @returns Transaction hash
   */
  async updateAgent(
    tokenId: string | number,
    newDomain: string,
    newAgentCardURI: string
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.updateAgent(tokenId, newDomain, newAgentCardURI);
    return tx;
  }

  /**
   * Get the domain for a given token ID
   * @param tokenId The token ID to query
   * @returns The agent's domain
   */
  async getDomain(tokenId: string | number): Promise<string> {
    return await this.contract.getDomain(tokenId);
  }

  /**
   * Get the token ID for a given domain
   * @param domain The domain to query
   * @returns The token ID (0 if not found)
   */
  async getTokenIdByDomain(domain: string): Promise<string> {
    const tokenId = await this.contract.getTokenIdByDomain(domain);
    return tokenId.toString();
  }
}
