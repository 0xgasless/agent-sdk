import { ethers } from 'ethers';
import { fujiNetworkConfig, mainnetNetworkConfig } from '../fuji-config.js';
import { IdentityV2 } from '../erc8004/identity';
import { NetworkConfig } from '../types';

export class ERC8004Provider {
  private identityClient: IdentityV2;
  private wallet: ethers.Wallet;

  constructor(rpcUrl: string, privateKey: string, network: string = 'avax-mainnet') {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, provider);
    
    // Select config based on network
    let networkConfig: NetworkConfig;
    
    if (network === 'avax-fuji' || network === 'fuji') {
      networkConfig = { ...fujiNetworkConfig }; // Clone to avoid mutation
    } else if (network === 'avax-mainnet' || network === 'avalanche' || network === 'mainnet') {
      // Avalanche Mainnet Config - LIVE
      networkConfig = { ...mainnetNetworkConfig };
    } else {
      // Default fallback -> Mainnet (production default)
      networkConfig = { ...mainnetNetworkConfig };
    }

    // Override RPC if provided explicitly
    if (rpcUrl) {
      networkConfig.rpcUrl = rpcUrl;
    }

    this.identityClient = new IdentityV2(networkConfig, this.wallet);
  }

  /**
   * Get the wallet address
   */
  getAddress(): string {
    return this.wallet.address;
  }

  /**
   * Check if the wallet has a registered agent
   */
  async isRegistered(): Promise<boolean> {
    try {
      const balance = await this.identityClient.balanceOf(this.wallet.address);
      return balance > 0;
    } catch (error) {
      console.error("Error checking registration:", error);
      return false;
    }
  }

  /**
  /**
   * Register a new agent (v0.2 - URI only)
   * Note: Ignores 'name' as v0.2 relies on agentURI or metadata.
   * @param agentURI IPFS or HTTP URI pointing to agent metadata
   * @param _name Optional name of the agent (not directly used in register(string))
   * @returns Token ID of the registered agent
   */
  async register(agentURI: string, _name: string = ''): Promise<string> {
    console.log(`Registering agent with URI: ${agentURI}...`);
    // v0.2 register only takes agentURI
    const tx = await this.identityClient.register(agentURI);
    console.log(`Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Check for Registered event first (from V2 logic)
    // The client doesn't return ID directly in v1/v2 change, but we have helper or can parse logs
    // IdentityRegistryClientV2 has helper getAgentIdByOwner but here we want it from receipt
    
    // We can try to find the ID from logs
    if (receipt) {
      // Find Registered event
      // Event: Registered(uint256 indexed agentId, string agentURI, address indexed owner)
      // Topic 0 is Keccak(...)
      const registeredTopic = ethers.id("Registered(uint256,string,address)");
      const event = receipt.logs.find(log => log.topics[0] === registeredTopic);
      if (event) {
        // agentId is 1st indexed param (topics[1])
        const agentId = BigInt(event.topics[1]).toString();
        return agentId;
      }

      // Fallback to Transfer event (mint)
      // Event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
      const transferTopic = ethers.id("Transfer(address,address,uint256)");
      const transferEvent = receipt.logs.find(log => log.topics[0] === transferTopic && BigInt(log.topics[1]) === 0n);
      if (transferEvent) {
          const tokenId = BigInt(transferEvent.topics[3]).toString();
          return tokenId;
      }
    }

    // Fallback: Check by owner if event parsing fails
    const id = await this.identityClient.getAgentIdByOwner(this.wallet.address);
    return id || tx.hash;
  }

  /**
   * Get agent URI by token ID
   */
  async getAgentURI(tokenId: string | number): Promise<string> {
    return await this.identityClient.tokenURI(tokenId);
  }

  /**
   * Get the underlying contract
   */
  getContract(): ethers.Contract {
    return this.identityClient.getContract();
  }
}
