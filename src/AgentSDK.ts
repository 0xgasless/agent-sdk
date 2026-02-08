import { Signer, Provider, JsonRpcProvider } from 'ethers';
import { WalletProviderSigner } from './WalletProviderSigner';
import { AgentSDKConfig, NetworkConfig, SupportedNetwork } from './types';
import { NetworkRegistry } from './config';
import { WalletManager } from './wallet';
import { IWalletProvider } from './wallet/types';
import { FacilitatorClient } from './x402/facilitatorClient';
import { x402Fetch } from './x402/httpClient';
import { IdentityRegistryClientV2 } from './erc8004/identity';
import { ReputationRegistryClientV2 } from './erc8004/reputation';
import { ValidationRegistryClientV2 } from './erc8004/validation';

/**
 * Agent SDK - Wallet-Agnostic
 * 
 * A wallet-agnostic SDK for building autonomous AI agents on Avalanche
 * with ERC-8004 identity and x402 gasless payments.
 * 
 * Accepts any `ethers.Signer` - developers bring their own wallet.
 * Works with Privy, Dynamic, MetaMask, ethers Wallet, viem, etc.
 * 
 * @example
 * ```typescript
 * import { AgentSDK } from 'agent-sdk';
 * import { Wallet, JsonRpcProvider } from 'ethers';
 * 
 * const provider = new JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
 * const wallet = new Wallet('0xYOUR_PRIVATE_KEY', provider);
 * 
 * const sdk = new AgentSDK({
 *   networks: fujiConfig.networks,
 *   defaultNetwork: 'fuji',
 *   signer: wallet,
 * });
 * 
 * // Register agent
 * await sdk.erc8004.identity().newAgent('my-agent', 'ipfs://QmAgentCard...');
 * 
 * // Make payment
 * await sdk.x402.pay({ to: '0x...', amount: '5000000' });
 * ```
 */
export class AgentSDK {
  private readonly registry: NetworkRegistry;
  private readonly signer: Signer;
  private readonly provider?: Provider; // Allow undefined initially
  private readonly network: NetworkConfig;

  /**
   * Create a new Agent SDK instance
   * 
   * @param cfg - Configuration object with networks and signer
   * @throws {Error} If signer is not provided
   * @throws {Error} If provider cannot be determined
   * 
   * @example
   * ```typescript
   * const sdk = new AgentSDK({
   *   networks: fujiConfig.networks,
   *   defaultNetwork: 'fuji',
   *   signer: wallet, // Any ethers.Signer
   * });
   * ```
   */
  private readonly walletManager?: WalletManager;

  constructor(cfg: AgentSDKConfig) {
    this.registry = new NetworkRegistry(cfg);
    
    // Determine provider first
    if (cfg.provider) {
      this.provider = cfg.provider;
    } else if (cfg.defaultNetwork) {
      // Fallback: create provider from network config
      const network = this.registry.get(cfg.defaultNetwork);
      this.provider = new JsonRpcProvider(network.rpcUrl, network.chainId);
    } else {
      // Will be checked later if signer has provider
      // But we need a provider for WalletManager ideally
    }

    // Initialize Wallet (Priority: cfg.wallet > cfg.signer)
    if (cfg.wallet) {
      this.walletManager = new WalletManager(cfg.wallet);
      const walletProvider = this.walletManager.getProvider();
      
      // Adapt IWalletProvider to ethers.Signer
      this.signer = new WalletProviderSigner(walletProvider, this.provider || null);
      
      // If we didn't have a provider, try to get one? 
      // WalletProviderSigner allows provider to be null, but needed for some ops
    } else if (cfg.signer) {
      this.signer = cfg.signer;
    } else {
      throw new Error('Signer or Wallet config is required.');
    }
    
    // Ensure provider is set
    if (!this.provider) {
      if (this.signer.provider) {
        this.provider = this.signer.provider as Provider;
      } else {
         throw new Error('Provider must be provided, available on signer, or defaultNetwork must be set.');
      }
    }

    // Connect signer to provider if needed
    if (this.signer.provider !== this.provider) {
      // Try to connect signer to provider
      if ('connect' in this.signer && typeof this.signer.connect === 'function') {
        try {
            (this.signer as any) = this.signer.connect(this.provider);
        } catch (e) {
            // Ignore if connect fails (some signers like JsonRpcSigner are immutable)
        }
      }
    }
    
    // Get network config
    this.network = this.registry.get(cfg.defaultNetwork);
  }

  /**
   * Get the wallet provider (if initialized via wallet config)
   */
  getWalletProvider(): IWalletProvider {
    if (this.walletManager) {
      return this.walletManager.getProvider();
    }
    throw new Error('Wallet provider not available (SDK initialized with raw signer)');
  }

  getNetwork(network?: SupportedNetwork): NetworkConfig {
    return this.registry.get(network || this.network.name);
  }

  /**
   * Get the signer (wallet)
   * 
   * @returns The ethers.Signer instance
   */
  getSigner(): Signer {
    return this.signer;
  }

  /**
   * Get the provider
   * 
   * @returns The ethers.Provider instance
   */
  getProvider(): Provider {
    return this.provider!;
  }

  /**
   * Get wallet address
   * 
   * @returns Promise resolving to the wallet address
   * 
   * @example
   * ```typescript
   * const address = await sdk.getAddress();
   * console.log('Agent address:', address);
   * ```
   */
  async getAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  /**
   * Create a new session key for the agent
   * 
   * @param options Configuration for the session key
   * @returns SessionKeyInfo object
   */
  async createAgentSession(options: {
    maxSpendPerTx: string | bigint;
    maxSpendPerDay: string | bigint;
    validForDays: number;
    whitelistedContracts?: string[];
  }): Promise<import('./utils/SessionKeyHelper').SessionKeyInfo> {
    const { SessionKeyHelper } = await import('./utils/SessionKeyHelper');
    
    return SessionKeyHelper.generateSessionKey({
      maxSpendPerTx: BigInt(options.maxSpendPerTx),
      maxSpendPerDay: BigInt(options.maxSpendPerDay),
      validForSeconds: options.validForDays * 24 * 60 * 60,
      whitelistedContracts: options.whitelistedContracts || [],
    });
  }

  // x402
  getFacilitator(network?: SupportedNetwork): FacilitatorClient {
    const cfg = this.getNetwork(network);
    if (!cfg.x402?.facilitatorUrl) {
      throw new Error(`x402 facilitatorUrl not configured for ${cfg.name}`);
    }
    return new FacilitatorClient({ url: cfg.x402.facilitatorUrl });
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit, network?: SupportedNetwork) {
    const net = this.getNetwork(network);
    const facilitator = this.getFacilitator(network);
    // x402 expects Wallet, but Signer is compatible
    return x402Fetch(input, init, { facilitator, networkCfg: net, wallet: this.signer as any });
  }

  // ERC-8004
  erc8004 = {
    identity: (network?: SupportedNetwork) => {
      const net = this.getNetwork(network);
      // const provider = this.getProvider();
      // Connect signer to provider and cast to Wallet (compatible types)
      // const signer = this.signer.connect(provider) as any;
      // return new IdentityRegistryClient(net, signer);
      // Use signer directly - it's already connected to a provider
      // JsonRpcSigner doesn't support connect(), so we use it as-is
      return new IdentityRegistryClientV2(net, this.signer as any);
    },
    reputation: (network?: SupportedNetwork) => {
      const net = this.getNetwork(network);
        // const provider = this.getProvider();
        // const signer = this.signer.connect(provider) as any;
        // return new ReputationRegistryClient(net, signer);
        // Use signer directly - it's already connected to a provider
      return new ReputationRegistryClientV2(net, this.signer as any);
    },
    validation: (network?: SupportedNetwork) => {
      const net = this.getNetwork(network);
        // const provider = this.getProvider();
        // const signer = this.signer.connect(provider) as any;
        // return new ValidationRegistryClient(net, signer);
        // Use signer directly - it's already connected to a provider
      return new ValidationRegistryClientV2(net, this.signer as any);
    },
  };
}
