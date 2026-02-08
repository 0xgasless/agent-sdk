/**
 * Session Key Manager - Hybrid Approach
 * 
 * Manages session keys with constraints, stored in your own database.
 * No vendor lock-in, fully customizable.
 */

import { Wallet } from 'ethers';
import { randomBytes, createHash } from 'crypto';

export interface SessionKeyConstraints {
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  validForSeconds: number;
  whitelistedContracts: string[];
}

export interface SessionKey {
  id: string;
  privateKey: string;
  address: string;
  parentAddress: string; // User's main wallet
  validUntil: number; // Unix timestamp
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  spentToday: bigint;
  lastResetTime: number; // Unix timestamp
  whitelistedContracts: string[];
  createdAt: number; // Unix timestamp
  revoked: boolean;
}

export interface DatabaseAdapter {
  create(data: any): Promise<any>;
  findOne(where: any): Promise<any | null>;
  findMany(where: any): Promise<any[]>;
  update(where: any, data: any): Promise<any>;
  delete(where: any): Promise<any>;
}

export class SessionKeyManager {
  private db: DatabaseAdapter;
  private encryptionKey: string;
  
  constructor(database: DatabaseAdapter, encryptionKey?: string) {
    this.db = database;
    this.encryptionKey = encryptionKey || process.env.SESSION_KEY_ENCRYPTION_KEY || 'default-key-change-in-production';
  }
  
  /**
   * Create a new session key for an agent
   */
  async createSessionKey(
    parentWalletAddress: string,
    constraints: SessionKeyConstraints
  ): Promise<SessionKey> {
    // Generate new Ethereum wallet
    const wallet = Wallet.createRandom();
    
    // Create session key object
    const sessionKey: SessionKey = {
      id: this.generateId(),
      privateKey: wallet.privateKey,
      address: wallet.address,
      parentAddress: parentWalletAddress.toLowerCase(),
      validUntil: Math.floor(Date.now() / 1000) + constraints.validForSeconds,
      maxSpendPerTx: constraints.maxSpendPerTx,
      maxSpendPerDay: constraints.maxSpendPerDay,
      spentToday: 0n,
      lastResetTime: Math.floor(Date.now() / 1000),
      whitelistedContracts: constraints.whitelistedContracts.map(c => c.toLowerCase()),
      createdAt: Math.floor(Date.now() / 1000),
      revoked: false,
    };
    
    // Encrypt private key before storing
    const encryptedPrivateKey = this.encrypt(sessionKey.privateKey);
    
    // Store in database
    await this.db.create({
      id: sessionKey.id,
      privateKey: encryptedPrivateKey,
      address: sessionKey.address.toLowerCase(),
      parentAddress: sessionKey.parentAddress,
      validUntil: sessionKey.validUntil,
      maxSpendPerTx: sessionKey.maxSpendPerTx.toString(),
      maxSpendPerDay: sessionKey.maxSpendPerDay.toString(),
      spentToday: '0',
      lastResetTime: sessionKey.lastResetTime,
      whitelistedContracts: JSON.stringify(sessionKey.whitelistedContracts),
      createdAt: sessionKey.createdAt,
      revoked: false,
    });
    
    console.log('✅ Session key created:', {
      id: sessionKey.id,
      address: sessionKey.address,
      validUntil: new Date(sessionKey.validUntil * 1000).toISOString(),
      maxSpendPerDay: this.formatUSDT(sessionKey.maxSpendPerDay),
    });
    
    return sessionKey;
  }
  
  /**
   * Validate a transaction against session key constraints
   */
  async validateTransaction(
    sessionKeyAddress: string,
    tx: {
      to: string;
      value: bigint;
      data?: string;
    }
  ): Promise<{ valid: boolean; reason?: string }> {
    // Get session key from database
    const sessionKey = await this.getSessionKey(sessionKeyAddress);
    
    if (!sessionKey) {
      return { valid: false, reason: 'Session key not found' };
    }
    
    if (sessionKey.revoked) {
      return { valid: false, reason: 'Session key has been revoked' };
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > sessionKey.validUntil) {
      return { valid: false, reason: 'Session key expired' };
    }
    
    // Check whitelist
    const targetAddress = tx.to.toLowerCase();
    if (!sessionKey.whitelistedContracts.includes(targetAddress)) {
      return { 
        valid: false, 
        reason: `Contract ${tx.to} not whitelisted. Allowed: ${sessionKey.whitelistedContracts.join(', ')}` 
      };
    }
    
    // Check per-transaction limit
    if (tx.value > sessionKey.maxSpendPerTx) {
      return { 
        valid: false, 
        reason: `Transaction value ${this.formatUSDT(tx.value)} exceeds limit ${this.formatUSDT(sessionKey.maxSpendPerTx)}` 
      };
    }
    
    // Reset daily spend if new day
    const daysPassed = Math.floor((now - sessionKey.lastResetTime) / 86400);
    if (daysPassed >= 1) {
      sessionKey.spentToday = 0n;
      sessionKey.lastResetTime = now;
      await this.updateDailySpend(sessionKeyAddress, 0n, now);
    }
    
    // Check daily limit
    const newDailyTotal = sessionKey.spentToday + tx.value;
    if (newDailyTotal > sessionKey.maxSpendPerDay) {
      return { 
        valid: false, 
        reason: `Daily limit exceeded. Spent: ${this.formatUSDT(sessionKey.spentToday)}, Trying: ${this.formatUSDT(tx.value)}, Limit: ${this.formatUSDT(sessionKey.maxSpendPerDay)}` 
      };
    }
    
    // Update spent amount
    await this.updateDailySpend(sessionKeyAddress, newDailyTotal, sessionKey.lastResetTime);
    
    return { valid: true };
  }
  
  /**
   * Revoke a session key
   */
  async revokeSessionKey(sessionKeyAddress: string): Promise<void> {
    await this.db.update(
      { address: sessionKeyAddress.toLowerCase() },
      { revoked: true }
    );
    console.log('🚫 Session key revoked:', sessionKeyAddress);
  }
  
  /**
   * Get all session keys for a parent wallet
   */
  async getSessionKeysForWallet(parentAddress: string): Promise<SessionKey[]> {
    const keys = await this.db.findMany({
      parentAddress: parentAddress.toLowerCase(),
    });
    
    return keys.map(k => ({
      id: k.id,
      privateKey: this.decrypt(k.privateKey),
      address: k.address,
      parentAddress: k.parentAddress,
      validUntil: k.validUntil,
      maxSpendPerTx: BigInt(k.maxSpendPerTx),
      maxSpendPerDay: BigInt(k.maxSpendPerDay),
      spentToday: BigInt(k.spentToday),
      lastResetTime: k.lastResetTime,
      whitelistedContracts: JSON.parse(k.whitelistedContracts),
      createdAt: k.createdAt,
      revoked: k.revoked,
    }));
  }
  
  /**
   * Get a session key by address
   */
  async getSessionKey(address: string): Promise<SessionKey | null> {
    const key = await this.db.findOne({
      address: address.toLowerCase(),
    });
    
    if (!key) return null;
    
    return {
      id: key.id,
      privateKey: this.decrypt(key.privateKey),
      address: key.address,
      parentAddress: key.parentAddress,
      validUntil: key.validUntil,
      maxSpendPerTx: BigInt(key.maxSpendPerTx),
      maxSpendPerDay: BigInt(key.maxSpendPerDay),
      spentToday: BigInt(key.spentToday),
      lastResetTime: key.lastResetTime,
      whitelistedContracts: JSON.parse(key.whitelistedContracts),
      createdAt: key.createdAt,
      revoked: key.revoked,
    };
  }
  
  // Private helper methods
  private generateId(): string {
    return 'sk_' + randomBytes(16).toString('hex');
  }
  
  private encrypt(text: string): string {
    // Simple encryption using hash (for production, use AES-256-GCM)
    // TODO: Replace with proper encryption library (crypto-js, node-forge, etc.)
    const hash = createHash('sha256').update(this.encryptionKey + text).digest('hex');
    return hash.substring(0, 64) + text; // Simplified - use proper encryption!
  }
  
  private decrypt(encrypted: string): string {
    // Decrypt (simplified - use proper decryption!)
    // For now, just return the original if it looks like a private key
    if (encrypted.startsWith('0x') && encrypted.length === 66) {
      return encrypted; // Already decrypted or stored in plain text (NOT RECOMMENDED)
    }
    // In production, implement proper decryption
    return encrypted.substring(64); // Simplified
  }
  
  private async updateDailySpend(
    address: string,
    newSpent: bigint,
    resetTime: number
  ): Promise<void> {
    await this.db.update(
      { address: address.toLowerCase() },
      { 
        spentToday: newSpent.toString(),
        lastResetTime: resetTime,
      }
    );
  }
  
  private formatUSDT(amount: bigint): string {
    return (Number(amount) / 1e6).toFixed(6) + ' USDT';
  }
}

