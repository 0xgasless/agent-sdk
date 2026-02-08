/**
 * Session Key Helper - Optional Utility
 * 
 * Provides utilities for session key patterns.
 * NOTE: Storage and validation is up to the application developer!
 */

import { Wallet, Provider } from 'ethers';

export interface SessionKeyConstraints {
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  validForSeconds: number;
  whitelistedContracts: string[];
}

export interface SessionKeyInfo {
  privateKey: string;
  address: string;
  createdAt: number;
  validUntil: number;
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  whitelistedContracts: string[];
}

export interface SessionKeyConstraints {
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  validForSeconds: number;
  whitelistedContracts: string[];
}

/**
 * Helper class for session key patterns
 * 
 * This is an OPTIONAL utility. Developers can:
 * - Use this helper
 * - Implement their own session key logic
 * - Use a different approach entirely
 */
export class SessionKeyHelper {
  /**
   * Generate a new session key wallet
   */
  static generateSessionKey(constraints: SessionKeyConstraints): SessionKeyInfo {
    const wallet = Wallet.createRandom();
    const now = Math.floor(Date.now() / 1000);
    
    return {
      privateKey: wallet.privateKey,
      address: wallet.address,
      createdAt: now,
      validUntil: now + constraints.validForSeconds,
      maxSpendPerTx: constraints.maxSpendPerTx,
      maxSpendPerDay: constraints.maxSpendPerDay,
      whitelistedContracts: constraints.whitelistedContracts,
    };
  }
  
  /**
   * Create a Wallet instance from session key
   */
  static createWallet(sessionKey: SessionKeyInfo, provider?: Provider): Wallet {
    const wallet = new Wallet(sessionKey.privateKey);
    return provider ? wallet.connect(provider) : wallet;
  }
  
  /**
   * Validate a transaction against constraints (client-side check)
   * 
   * NOTE: This is a client-side validation. For production, you should
   * also validate on your backend/database!
   */
  static validateTransaction(
    sessionKey: SessionKeyInfo,
    tx: {
      to: string;
      value: bigint;
    },
    spentToday: bigint
  ): { valid: boolean; reason?: string } {
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiry
    if (now > sessionKey.validUntil) {
      return { valid: false, reason: 'Session key expired' };
    }
    
    // Check whitelist
    if (!sessionKey.whitelistedContracts.includes(tx.to.toLowerCase())) {
      return { 
        valid: false, 
        reason: `Contract ${tx.to} not whitelisted. Allowed: ${sessionKey.whitelistedContracts.join(', ')}` 
      };
    }
    
    // Check per-tx limit
    if (tx.value > sessionKey.maxSpendPerTx) {
      return { 
        valid: false, 
        reason: `Transaction value exceeds per-transaction limit. Max: ${this.formatUSDT(sessionKey.maxSpendPerTx)}` 
      };
    }
    
    // Check daily limit
    if (spentToday + tx.value > sessionKey.maxSpendPerDay) {
      return { 
        valid: false, 
        reason: `Would exceed daily limit. Spent: ${this.formatUSDT(spentToday)}, Trying: ${this.formatUSDT(tx.value)}, Limit: ${this.formatUSDT(sessionKey.maxSpendPerDay)}` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check if session key is expired
   */
  static isExpired(sessionKey: SessionKeyInfo): boolean {
    const now = Math.floor(Date.now() / 1000);
    return now > sessionKey.validUntil;
  }
  
  /**
   * Format USDT amount (6 decimals)
   */
  private static formatUSDT(amount: bigint): string {
    return (Number(amount) / 1e6).toFixed(6) + ' USDT';
  }
  
  /**
   * Example storage interface (developers implement this)
   * 
   * This is just documentation - you need to implement your own storage!
   */
  static exampleStorageInterface = {
    save: async (_sessionKey: SessionKeyInfo) => {
      console.warn('⚠️ Implement your own storage! Examples:');
      console.warn('   - localStorage (testing only)');
      console.warn('   - Database (PostgreSQL, MongoDB)');
      console.warn('   - Encrypted cloud storage');
      console.warn('   - Hardware wallet delegation');
      throw new Error('Storage not implemented');
    },
    load: async (_address: string): Promise<SessionKeyInfo | null> => {
      console.warn('⚠️ Implement your own storage!');
      return null;
    },
    updateSpentToday: async (_address: string, _amount: bigint) => {
      console.warn('⚠️ Implement your own storage!');
    },
  };
}

