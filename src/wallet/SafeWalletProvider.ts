import { IWalletProvider, WalletConfig, SessionKeyInfo, SessionKeyConstraints } from './types';
import { Wallet, HDNodeWallet } from 'ethers';

/**
 * Safe Wallet Provider (Option 2)
 * 
 * Note: This requires @safe-global/protocol-kit and @safe-global/api-kit
 * For MVP, you can use TypeScript validation instead of deploying contracts
 */
export class SafeWalletProvider implements IWalletProvider {
  private config: WalletConfig;
  private sessionWallet?: Wallet | HDNodeWallet;
  private dailySpend: Map<string, { amount: bigint; resetTime: number }> = new Map();
  // private safe?: Safe; // Uncomment when Safe SDK is installed
  
  constructor(config: WalletConfig) {
    this.config = config;
    
    if (config.sessionKey) {
      this.sessionWallet = new Wallet(config.sessionKey.privateKey);
    }
  }
  
  async initialize() {
    // TODO: Initialize Safe wallet when Safe SDK is available
    // const provider = new ethers.JsonRpcProvider(this.config.network?.rpcUrl);
    // this.safe = await Safe.init({
    //   provider,
    //   safeAddress: this.config.safeAddress!,
    // });
  }
  
  async getAddress(): Promise<string> {
    if (this.config.safeAddress) {
      return this.config.safeAddress;
    }
    if (this.sessionWallet) {
      return this.sessionWallet.address;
    }
    throw new Error('No wallet address available');
  }
  
  async signMessage(message: string): Promise<string> {
    if (this.sessionWallet) {
      return this.sessionWallet.signMessage(message);
    }
    
    // TODO: Use Safe's multi-sig signing when available
    throw new Error('Safe signing not yet implemented. Use session key.');
  }
  
  async signTransaction(tx: any): Promise<string> {
    if (this.sessionWallet) {
      const signed = await this.sessionWallet.signTransaction(tx);
      return signed;
    }
    
    throw new Error('Safe transaction signing not yet implemented');
  }
  
  async sendTransaction(tx: any): Promise<string> {
    // Validate if using session key
    if (this.config.sessionKey) {
      await this.validateTransaction(tx);
    }
    
    if (this.sessionWallet) {
      const response = await this.sessionWallet.sendTransaction(tx);
      return response.hash;
    }
    
    // TODO: Create and execute Safe transaction when Safe SDK is available
    // const safeTx = await this.safe!.createTransaction({
    //   transactions: [tx],
    // });
    // const executedTx = await this.safe!.executeTransaction(safeTx);
    // return executedTx.hash;
    
    throw new Error('Safe transaction execution not yet implemented');
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
    
    // Store session key in config
    this.config.sessionKey = sessionKey;
    this.sessionWallet = sessionWallet;
    
    // TODO: Enable session key module on Safe when Safe SDK is available
    // const enableTx = await this.safe!.createTransaction({
    //   transactions: [
    //     {
    //       to: this.config.safeAddress!,
    //       value: '0',
    //       data: encodeEnableSessionKey(sessionWallet.address, constraints),
    //     },
    //   ],
    // });
    // await this.safe!.executeTransaction(enableTx);
    
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
    const today = Math.floor(now / 86400);
    const spendRecord = this.dailySpend.get(address);
    
    if (spendRecord && spendRecord.resetTime === today) {
      if (spendRecord.amount + txValue > sessionKey.maxSpendPerDay) {
        throw new Error(
          `Transaction would exceed daily limit. ` +
          `Spent today: ${spendRecord.amount}, Limit: ${sessionKey.maxSpendPerDay}`
        );
      }
      spendRecord.amount += txValue;
    } else {
      this.dailySpend.set(address, {
        amount: txValue,
        resetTime: today,
      });
    }
  }
  
  getDailySpend(): bigint {
    const address = this.sessionWallet?.address;
    if (!address) return 0n;
    
    const spendRecord = this.dailySpend.get(address);
    return spendRecord?.amount || 0n;
  }
}

