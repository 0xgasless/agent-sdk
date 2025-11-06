import { JsonRpcProvider, Wallet } from 'ethers';
import { AgentSDKConfig, NetworkConfig, SupportedNetwork } from './types';
import { NetworkRegistry } from './config';
import { FacilitatorClient } from './x402/facilitatorClient';
import { x402Fetch } from './x402/httpClient';
import { IdentityRegistryClient } from './erc8004/identity';
import { ReputationRegistryClient } from './erc8004/reputation';
import { ValidationRegistryClient } from './erc8004/validation';

export class AgentSDK {
  private readonly registry: NetworkRegistry;
  private readonly wallet?: Wallet;

  constructor(cfg: AgentSDKConfig) {
    this.registry = new NetworkRegistry(cfg);
    this.wallet = cfg.privateKey ? new Wallet(cfg.privateKey) : undefined;
  }

  getNetwork(network?: SupportedNetwork): NetworkConfig {
    return this.registry.get(network);
  }

  getWallet(): Wallet {
    if (!this.wallet) {
      throw new Error('No wallet configured. Provide privateKey in AgentSDKConfig or use your own Wallet.');
    }
    return this.wallet;
  }

  getProvider(network?: SupportedNetwork): JsonRpcProvider {
    const cfg = this.getNetwork(network);
    return new JsonRpcProvider(cfg.rpcUrl, cfg.chainId);
  }

  // x402
  getFacilitator(network?: SupportedNetwork): FacilitatorClient {
    const cfg = this.getNetwork(network);
    if (!cfg.x402?.facilitatorUrl) throw new Error(`x402 facilitatorUrl not configured for ${cfg.name}`);
    return new FacilitatorClient({ url: cfg.x402.facilitatorUrl });
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit, network?: SupportedNetwork) {
    const net = this.getNetwork(network);
    const provider = this.getProvider(network);
    const wallet = this.getWallet().connect(provider);
    const facilitator = this.getFacilitator(network);
    return x402Fetch(input, init, { facilitator, networkCfg: net, wallet });
  }

  // ERC-8004
  erc8004 = {
    identity: (network?: SupportedNetwork) => {
      const net = this.getNetwork(network);
      const provider = this.getProvider(network);
      const signer = this.getWallet().connect(provider);
      return new IdentityRegistryClient(net, signer);
    },
    reputation: (network?: SupportedNetwork) => {
      const net = this.getNetwork(network);
      const provider = this.getProvider(network);
      const signer = this.getWallet().connect(provider);
      return new ReputationRegistryClient(net, signer);
    },
    validation: (network?: SupportedNetwork) => {
      const net = this.getNetwork(network);
      const provider = this.getProvider(network);
      const signer = this.getWallet().connect(provider);
      return new ValidationRegistryClient(net, signer);
    }
  };
}


