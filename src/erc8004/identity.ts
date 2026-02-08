import { Contract, JsonRpcProvider, Wallet, ContractTransactionResponse } from 'ethers';
import { NetworkConfig } from '../types';
import IdentityRegistryABI from './abis/IdentityRegistry.json';

/**
 * v0.2 Identity Registry Client
 * Uses official ERC-8004 interface (UUPS upgradeable)
 */
export class IdentityRegistryClientV2 {
  private readonly contract: Contract;

  constructor(network: NetworkConfig, signerOrProvider: Wallet | JsonRpcProvider) {
    if (!network.erc8004?.identityRegistry) {
      throw new Error(`Identity registry not configured for network ${network.name}`);
    }
    this.contract = new Contract(network.erc8004.identityRegistry, IdentityRegistryABI, signerOrProvider as any);
  }

  /**
   * Register a new agent (official ERC-8004 interface)
   * @param agentURI URI pointing to the Agent Card JSON (IPFS, Arweave, etc.)
   * @returns Transaction response
   */
  async register(agentURI: string): Promise<ContractTransactionResponse> {
    const tx = await this.contract.getFunction('register(string)')(agentURI);
    return tx;
  }

  /**
   * Set or update the agent URI
   * @param agentId The agent token ID
   * @param agentURI New URI for the agent
   * @returns Transaction response
   */
  async setAgentURI(agentId: string | number, agentURI: string): Promise<ContractTransactionResponse> {
    const tx = await this.contract.setAgentURI(agentId, agentURI);
    return tx;
  }

  /**
   * Set verified wallet with EIP-712 signature
   * @param agentId The agent token ID
   * @param newWallet The new wallet address to verify
   * @param deadline Signature expiration timestamp
   * @param signature EIP-712 signature from newWallet
   * @returns Transaction response
   */
  async setAgentWallet(
    agentId: string | number,
    newWallet: string,
    deadline: number,
    signature: string
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.setAgentWallet(agentId, newWallet, deadline, signature);
    return tx;
  }

  /**
   * Get verified wallet for an agent
   * @param agentId The agent token ID
   * @returns The verified wallet address
   */
  async getAgentWallet(agentId: string | number): Promise<string> {
    return await this.contract.getAgentWallet(agentId);
  }

  /**
   * Unset the verified wallet
   * @param agentId The agent token ID
   * @returns Transaction response
   */
  async unsetAgentWallet(agentId: string | number): Promise<ContractTransactionResponse> {
    const tx = await this.contract.unsetAgentWallet(agentId);
    return tx;
  }

  /**
   * Get metadata for an agent
   * @param agentId The agent token ID
   * @param key The metadata key
   * @returns The metadata value as bytes
   */
  async getMetadata(agentId: string | number, key: string): Promise<string> {
    return await this.contract.getMetadata(agentId, key);
  }

  /**
   * Set metadata for an agent
   * @param agentId The agent token ID
   * @param key The metadata key
   * @param value The metadata value as bytes
   * @returns Transaction response
   */
  async setMetadata(
    agentId: string | number,
    key: string,
    value: string
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.setMetadata(agentId, key, value);
    return tx;
  }

  /**
   * Get agent URI (tokenURI)
   * @param agentId The agent token ID
   * @returns The agent's URI
   */
  async tokenURI(agentId: string | number): Promise<string> {
    return await this.contract.tokenURI(agentId);
  }

  /**
   * Get the owner of an agent
   * @param agentId The agent token ID
   * @returns The owner's address
   */
  async ownerOf(agentId: string | number): Promise<string> {
    return await this.contract.ownerOf(agentId);
  }

  /**
   * Check if caller is authorized or owner
   * @param agentId The agent token ID
   * @param addr The address to check
   * @returns True if authorized or owner
   */
  async isAuthorizedOrOwner(agentId: string | number, addr: string): Promise<boolean> {
    return await this.contract.isAuthorizedOrOwner(agentId, addr);
  }

  /**
   * Get balance of address (number of agents owned)
   * @param address The address to check
   * @returns Number of agents owned
   */
  async balanceOf(address: string): Promise<number> {
    const balance = await this.contract.balanceOf(address);
    return Number(balance);
  }

  /**
   * Transfer agent to new owner
   * @param from Current owner
   * @param to New owner
   * @param agentId The agent token ID
   * @returns Transaction response
   */
  async transferFrom(
    from: string,
    to: string,
    agentId: string | number
  ): Promise<ContractTransactionResponse> {
    const tx = await this.contract.transferFrom(from, to, agentId);
    return tx;
  }

  /**
   * Get the raw contract instance for advanced usage
   */
  getContract(): Contract {
    return this.contract;
  }

  /**
   * Find agent ID by owner address (queries Registered events)
   * @param owner The owner address
   * @returns The agent ID or null if not found
   */
  async getAgentIdByOwner(owner: string): Promise<string | null> {
    // Check balance first
    try {
      const balance = await this.balanceOf(owner);
      if (balance === 0) return null;
    } catch (e) {
      console.warn("Error checking balance:", e);
      // Continue anyway, balance check is an optimization
    }

    // Attempt to get current block number robustly
    let currentBlock = 0;
    try {
      if (this.contract.runner) {
        if (this.contract.runner.provider) {
          currentBlock = await this.contract.runner.provider.getBlockNumber();
        } else if (typeof (this.contract.runner as any).getBlockNumber === 'function') {
          currentBlock = await (this.contract.runner as any).getBlockNumber();
        }
      }
    } catch (e) {
      console.warn("Failed to get block number from contract runner:", e);
    }

    if (!currentBlock) {
      console.warn("Could not determine current block number, defaulting to limited history query (last 10000 blocks assumption)");
      // Fallback: This might fail if RPC assumes 0 for "start" but we try to be safe
      // If we really can't get block, we have to risk 0 or fail. 
      // Let's try to grab it from window.ethereum if available as last resort in browser?
      // No, let's just log and try 0, but user will see error.
    }

    // Default to looking back 10,000 blocks
    const fromBlock = currentBlock > 10000 ? currentBlock - 10000 : 0;
    
    console.log(`[IdentityV2] Querying Registered events for ${owner} from block ${fromBlock} to latest`);

    // Query events with restricted range to avoid RPC limits
    const filter = this.contract.filters.Registered(null, null, owner);
    
    try {
      const events = await this.contract.queryFilter(filter, fromBlock);
      
      if (events.length === 0) {
        console.warn(`[IdentityV2] Agent ID for ${owner} not found in blocks ${fromBlock}-latest.`);
        return null;
      }
      
      // Return the ID from the last event
      const lastEvent = events[events.length - 1];
      if ('args' in lastEvent) {
        return (lastEvent.args as any)[0].toString();
      }
    } catch (queryError) {
      console.error("[IdentityV2] Error querying filter:", queryError);
      throw queryError;
    }
    return null;
  }
  /**
   * Create EIP-712 signature for setting an agent wallet
   * @param agentId The agent token ID
   * @param walletAddress The wallet address being authorized
   * @param deadline Expiration timestamp
   * @param signer Ethers signer (must support signTypedData)
   */
  async createAgentWalletSignature(
    agentId: string | number,
    walletAddress: string,
    deadline: number,
    signer: any
  ): Promise<string> {
    const chainId = (await this.contract.runner?.provider?.getNetwork())?.chainId;
    if (!chainId) throw new Error("Could not determine chain ID");
    
    // owner is the current owner of the agent (which must be the signer usually, or signer must be approved)
    // But for the signature specifically, the contract constructs the hash using 'owner' param.
    // The struct in solidity is: AgentWalletSet(uint256 agentId,address newWallet,address owner,uint256 deadline)
    // We need to pass 'owner' to this function to be correct.
    const owner = await signer.getAddress();

    const domain = {
      name: "ERC8004IdentityRegistry", // Matches EIP712_init("ERC8004IdentityRegistry", "1")
      version: "1",
      chainId: chainId,
      verifyingContract: await this.contract.getAddress()
    };

    const types = {
      AgentWalletSet: [
        { name: "agentId", type: "uint256" },
        { name: "newWallet", type: "address" },
        { name: "owner", type: "address" },
        { name: "deadline", type: "uint256" }
      ]
    };

    const value = {
      agentId: agentId,
      newWallet: walletAddress,
      owner: owner,
      deadline: deadline
    };

    return await signer.signTypedData(domain, types, value);
  }
}

// Re-export for convenience
export { IdentityRegistryClientV2 as IdentityV2 };
