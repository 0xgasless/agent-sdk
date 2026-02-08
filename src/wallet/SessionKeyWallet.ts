/**
 * Session Key Wallet - Extends ethers Wallet with validation
 * 
 * Automatically validates transactions against session key constraints
 * before sending them to the network.
 */

import { Wallet, Provider, TransactionRequest, TransactionResponse } from 'ethers';
import { SessionKeyManager, SessionKey } from './SessionKeyManager';

export class SessionKeyWallet extends Wallet {
  private sessionKey: SessionKey;
  private sessionKeyManager: SessionKeyManager;
  
  constructor(
    sessionKey: SessionKey,
    sessionKeyManager: SessionKeyManager,
    provider?: Provider
  ) {
    super(sessionKey.privateKey, provider);
    this.sessionKey = sessionKey;
    this.sessionKeyManager = sessionKeyManager;
  }
  
  /**
   * Override sendTransaction to add validation
   */
  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    // Validate against session key constraints
    const validation = await this.sessionKeyManager.validateTransaction(
      this.sessionKey.address,
      {
        to: tx.to as string,
        value: BigInt(tx.value?.toString() || '0'),
        data: tx.data as string,
      }
    );
    
    if (!validation.valid) {
      throw new Error(`Transaction rejected: ${validation.reason}`);
    }
    
    // If valid, proceed with transaction
    console.log('✅ Transaction validated, sending...');
    return super.sendTransaction(tx);
  }
  
  /**
   * Get session key info
   */
  getSessionKeyInfo() {
    const now = Math.floor(Date.now() / 1000);
    const isExpired = now > this.sessionKey.validUntil;
    const isRevoked = this.sessionKey.revoked;
    
    return {
      id: this.sessionKey.id,
      address: this.sessionKey.address,
      parentAddress: this.sessionKey.parentAddress,
      validUntil: new Date(this.sessionKey.validUntil * 1000),
      isExpired,
      isRevoked,
      maxSpendPerTx: this.formatUSDT(this.sessionKey.maxSpendPerTx),
      maxSpendPerDay: this.formatUSDT(this.sessionKey.maxSpendPerDay),
      spentToday: this.formatUSDT(this.sessionKey.spentToday),
      remainingToday: this.formatUSDT(this.sessionKey.maxSpendPerDay - this.sessionKey.spentToday),
      whitelistedContracts: this.sessionKey.whitelistedContracts,
      createdAt: new Date(this.sessionKey.createdAt * 1000),
    };
  }
  
  /**
   * Check if session key is still valid
   */
  isValid(): boolean {
    const now = Math.floor(Date.now() / 1000);
    return !this.sessionKey.revoked && now < this.sessionKey.validUntil;
  }
  
  private formatUSDT(amount: bigint): string {
    return (Number(amount) / 1e6).toFixed(6) + ' USDT';
  }
}

