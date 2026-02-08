import { IWalletProvider, WalletConfig, SessionKeyInfo } from './types';
import { PrivyWalletProvider } from './PrivyWalletProvider';
import { SafeWalletProvider } from './SafeWalletProvider';
import { SessionKeyWalletProvider } from './SessionKeyWalletProvider';
import { SessionKeyManager } from './SessionKeyManager';
import { Wallet } from 'ethers';

export class WalletManager {
  private provider: IWalletProvider;
  public config: WalletConfig; // Expose config for AgentSDK access
  
  constructor(config: WalletConfig, sessionKeyManager?: SessionKeyManager) {
    this.config = config;
    
    switch (config.provider) {
      case 'privy':
        this.provider = new PrivyWalletProvider(config);
        break;
      case 'safe':
        this.provider = new SafeWalletProvider(config);
        break;
      case 'session-key':
        // Hybrid approach - requires SessionKeyManager
        if (!sessionKeyManager) {
          throw new Error('SessionKeyManager required for session-key provider');
        }
        this.provider = new SessionKeyWalletProvider(config, sessionKeyManager);
        break;
      case 'eoa':
        // Fallback for testing
        if (!config.privateKey) {
          throw new Error('Private key required for EOA provider');
        }
        this.provider = new EOAWalletProvider(config.privateKey);
        break;
      default:
        throw new Error(`Unknown wallet provider: ${config.provider}`);
    }
  }
  
  getProvider(): IWalletProvider {
    return this.provider;
  }
}

// Simple EOA wrapper for testing
class EOAWalletProvider implements IWalletProvider {
  private wallet: Wallet;
  
  constructor(privateKey: string) {
    this.wallet = new Wallet(privateKey);
  }
  
  async getAddress(): Promise<string> {
    return this.wallet.address;
  }
  
  async signMessage(message: string): Promise<string> {
    return this.wallet.signMessage(message);
  }
  
  async signTransaction(tx: any): Promise<string> {
    const signed = await this.wallet.signTransaction(tx);
    return signed;
  }
  
  async sendTransaction(tx: any): Promise<string> {
    const response = await this.wallet.sendTransaction(tx);
    return response.hash;
  }
  
  async createSessionKey(): Promise<SessionKeyInfo> {
    throw new Error('Session keys not supported for EOA. Use Privy or Safe.');
  }
}

