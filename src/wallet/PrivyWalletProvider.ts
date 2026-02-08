import { IWalletProvider, WalletConfig, SessionKeyInfo, SessionKeyConstraints } from './types';
// import { PrivyClient } from '@privy-io/server-auth';
import { Wallet, HDNodeWallet } from 'ethers';

export class PrivyWalletProvider implements IWalletProvider {
  private config: WalletConfig;
  // private privyClient?: PrivyClient;
  private sessionWallet?: Wallet | HDNodeWallet;
  private dailySpend: Map<string, { amount: bigint; resetTime: number }> = new Map();
  
  constructor(config: WalletConfig) {
    this.config = config;
    
    // If session key provided, use it directly
    if (config.sessionKey) {
      this.sessionWallet = new Wallet(config.sessionKey.privateKey);
    }
    
    // Initialize Privy client for server-side operations
    if (config.privyAppId) {
      // Deprecated package uses (appId, appSecret) constructor
      // this.privyClient = new PrivyClient(
      //   config.privyAppId,
      //   process.env.PRIVY_APP_SECRET || ''
      // );
    }
  }
  
  async getAddress(): Promise<string> {
    if (this.sessionWallet) {
      return this.sessionWallet.address;
    }
    throw new Error('No session wallet available. Create session key first.');
  }
  
  async signMessage(message: string): Promise<string> {
    if (!this.sessionWallet) {
      throw new Error('No session wallet available');
    }
    return this.sessionWallet.signMessage(message);
  }
  
  async signTransaction(tx: any): Promise<string> {
    if (!this.sessionWallet) {
      throw new Error('No session wallet available');
    }
    const signed = await this.sessionWallet.signTransaction(tx);
    return signed;
  }
  
  async sendTransaction(tx: any): Promise<string> {
    if (!this.sessionWallet) {
      throw new Error('No session wallet available');
    }
    
    // Validate against session key constraints
    if (this.config.sessionKey) {
      await this.validateTransaction(tx);
    }
    
    const response = await this.sessionWallet.sendTransaction(tx);
    return response.hash;
  }
  
  async createSessionKey(constraints: SessionKeyConstraints): Promise<SessionKeyInfo> {
    // Generate new session key
    const sessionWallet = Wallet.createRandom();
    
    const sessionKey: SessionKeyInfo = {
      privateKey: sessionWallet.privateKey,
      address: sessionWallet.address,
      validUntil: Math.floor(Date.now() / 1000) + constraints.validForSeconds,
      maxSpendPerTx: constraints.maxSpendPerTx,
      maxSpendPerDay: constraints.maxSpendPerDay,
      whitelistedContracts: constraints.whitelistedContracts,
      createdAt: Date.now(),
    };
    
    // Store session key in config for future use
    this.config.sessionKey = sessionKey;
    this.sessionWallet = sessionWallet;
    
    return sessionKey;
  }
  
  private async validateTransaction(tx: any): Promise<void> {
    const sessionKey = this.config.sessionKey!;
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiry
    if (now > sessionKey.validUntil) {
      throw new Error('Session key expired');
    }
    
    // Check whitelist
    if (tx.to && !sessionKey.whitelistedContracts.includes(tx.to.toLowerCase())) {
      throw new Error(`Contract ${tx.to} is not whitelisted`);
    }
    
    // Check spend limit per transaction
    const txValue = tx.value ? BigInt(tx.value.toString()) : 0n;
    if (txValue > sessionKey.maxSpendPerTx) {
      throw new Error(
        `Transaction value ${txValue} exceeds per-tx limit ${sessionKey.maxSpendPerTx}`
      );
    }
    
    // Check daily spend limit
    const address = await this.getAddress();
    const today = Math.floor(now / 86400); // Days since epoch
    const spendRecord = this.dailySpend.get(address);
    
    if (spendRecord && spendRecord.resetTime === today) {
      // Same day - check limit
      if (spendRecord.amount + txValue > sessionKey.maxSpendPerDay) {
        throw new Error(
          `Transaction would exceed daily limit. ` +
          `Spent today: ${spendRecord.amount}, Limit: ${sessionKey.maxSpendPerDay}`
        );
      }
      // Update daily spend
      spendRecord.amount += txValue;
    } else {
      // New day - reset
      this.dailySpend.set(address, {
        amount: txValue,
        resetTime: today,
      });
    }
  }
  
  /**
   * Get current daily spend for session key
   */
  getDailySpend(): bigint {
    const address = this.sessionWallet?.address;
    if (!address) return 0n;
    
    const spendRecord = this.dailySpend.get(address);
    return spendRecord?.amount || 0n;
  }
}

