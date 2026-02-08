/**
 * Session Key Wallet Provider - Hybrid Approach
 * 
 * Uses your own database-stored session keys with validation.
 * No vendor lock-in, fully customizable.
 */

import { IWalletProvider, WalletConfig, SessionKeyInfo, SessionKeyConstraints } from './types';
import { SessionKeyWallet } from './SessionKeyWallet';
import { SessionKeyManager, SessionKey } from './SessionKeyManager';
import { Wallet } from 'ethers';

export class SessionKeyWalletProvider implements IWalletProvider {
  private config: WalletConfig;
  private sessionKeyManager: SessionKeyManager;
  private sessionWallet?: SessionKeyWallet;
  
  constructor(config: WalletConfig, sessionKeyManager: SessionKeyManager) {
    this.config = config;
    this.sessionKeyManager = sessionKeyManager;
    
    // If session key provided, create wallet
    if (config.sessionKey) {
      const sessionKey: SessionKey = {
        id: config.sessionKey.id || '',
        privateKey: config.sessionKey.privateKey,
        address: config.sessionKey.address,
        parentAddress: config.sessionKey.parentAddress || '',
        validUntil: config.sessionKey.validUntil,
        maxSpendPerTx: config.sessionKey.maxSpendPerTx || 0n,
        maxSpendPerDay: config.sessionKey.maxSpendPerDay || 0n,
        spentToday: config.sessionKey.spentToday || 0n,
        lastResetTime: config.sessionKey.lastResetTime || Math.floor(Date.now() / 1000),
        whitelistedContracts: config.sessionKey.whitelistedContracts || [],
        createdAt: config.sessionKey.createdAt || Math.floor(Date.now() / 1000),
        revoked: config.sessionKey.revoked || false,
      };
      
      this.sessionWallet = new SessionKeyWallet(sessionKey, sessionKeyManager);
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
    
    // Validation happens automatically in SessionKeyWallet.sendTransaction()
    const response = await this.sessionWallet.sendTransaction(tx);
    return response.hash;
  }
  
  async createSessionKey(constraints: SessionKeyConstraints): Promise<SessionKeyInfo> {
    if (!this.config.sessionKey?.parentAddress) {
      throw new Error('Parent wallet address required to create session key');
    }
    
    const sessionKey = await this.sessionKeyManager.createSessionKey(
      this.config.sessionKey.parentAddress,
      constraints
    );
    
    // Create wallet from new session key
    this.sessionWallet = new SessionKeyWallet(sessionKey, this.sessionKeyManager);
    
    // Update config
    this.config.sessionKey = {
      id: sessionKey.id,
      privateKey: sessionKey.privateKey,
      address: sessionKey.address,
      parentAddress: sessionKey.parentAddress,
      validUntil: sessionKey.validUntil,
      maxSpendPerTx: sessionKey.maxSpendPerTx,
      maxSpendPerDay: sessionKey.maxSpendPerDay,
      spentToday: sessionKey.spentToday,
      lastResetTime: sessionKey.lastResetTime,
      whitelistedContracts: sessionKey.whitelistedContracts,
      createdAt: sessionKey.createdAt,
      revoked: sessionKey.revoked,
    };
    
    return this.config.sessionKey;
  }
  
  /**
   * Get underlying wallet (for compatibility with ethers)
   */
  getWallet(): Wallet {
    if (!this.sessionWallet) {
      throw new Error('No session wallet available');
    }
    return this.sessionWallet;
  }
  
  /**
   * Get session key info
   */
  getSessionKeyInfo() {
    if (!this.sessionWallet) {
      throw new Error('No session wallet available');
    }
    return this.sessionWallet.getSessionKeyInfo();
  }
}

