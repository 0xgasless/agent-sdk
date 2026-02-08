import { AgentSDKConfig, NetworkConfig } from './types';

export class NetworkRegistry {
  private networks: Record<string, NetworkConfig>;
  private defaultNetwork?: string;

  constructor(cfg: AgentSDKConfig) {
    this.networks = cfg.networks || {};
    this.defaultNetwork = cfg.defaultNetwork;
  }

  get(network?: string): NetworkConfig {
    const key = network || this.defaultNetwork;
    if (!key) {
      throw new Error('No network specified and no defaultNetwork configured');
    }
    const cfg = this.networks[key];
    if (!cfg) {
      throw new Error(`Unknown network: ${key}`);
    }
    return cfg;
  }
}
