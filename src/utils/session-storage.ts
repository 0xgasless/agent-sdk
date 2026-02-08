/**
 * Session Key Storage Utilities
 * 
 * Provides secure storage for session keys with encryption support
 */

export interface StoredSessionKey {
  privateKey: string; // Encrypted in production
  address: string;
  validUntil: number;
  maxSpendPerTx: string;
  maxSpendPerDay: string;
  whitelistedContracts: string[];
  createdAt: number;
  walletProvider: 'privy' | 'safe' | 'eoa';
}

/**
 * Store session key in localStorage (for development)
 * In production, use encrypted storage or backend
 */
export function storeSessionKey(
  key: string,
  sessionKey: StoredSessionKey
): void {
  try {
    localStorage.setItem(`agent_session_${key}`, JSON.stringify(sessionKey));
  } catch (error) {
    console.error('Failed to store session key:', error);
    throw new Error('Session key storage failed');
  }
}

/**
 * Retrieve session key from localStorage
 */
export function getStoredSessionKey(key: string): StoredSessionKey | null {
  try {
    const stored = localStorage.getItem(`agent_session_${key}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to retrieve session key:', error);
    return null;
  }
}

/**
 * Remove session key from storage
 */
export function removeStoredSessionKey(key: string): void {
  try {
    localStorage.removeItem(`agent_session_${key}`);
  } catch (error) {
    console.error('Failed to remove session key:', error);
  }
}

/**
 * List all stored session keys
 */
export function listStoredSessionKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('agent_session_')) {
        keys.push(key.replace('agent_session_', ''));
      }
    }
  } catch (error) {
    console.error('Failed to list session keys:', error);
  }
  return keys;
}

/**
 * Check if session key is expired
 */
export function isSessionKeyExpired(sessionKey: StoredSessionKey): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= sessionKey.validUntil;
}

/**
 * Encrypt session key (simple base64 for demo, use proper encryption in production)
 */
export function encryptSessionKey(privateKey: string, password: string): string {
  // TODO: Use proper encryption (AES-256-GCM) in production
  // For now, just base64 encode (NOT SECURE - for demo only)
  return Buffer.from(privateKey).toString('base64');
}

/**
 * Decrypt session key
 */
export function decryptSessionKey(encrypted: string, password: string): string {
  // TODO: Use proper decryption in production
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

