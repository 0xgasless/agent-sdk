export type WalletProvider = 'privy' | 'safe' | 'eoa' | 'session-key';

export interface WalletConfig {
  provider: WalletProvider;
  
  // For EOA (testing only)
  privateKey?: string;
  
  // For Privy (Option 1)
  privyAppId?: string;
  privyUserId?: string;
  
  // For Safe (Option 2)
  safeAddress?: string;
  ownerAddress?: string;
  
  // For Session Key (Hybrid Option 2.5)
  sessionKey?: SessionKeyInfo;
  sessionKeyManager?: any; // SessionKeyManager instance
}

export interface SessionKeyInfo {
  id?: string;
  privateKey: string;
  address: string;
  parentAddress?: string; // User's main wallet address
  validUntil: number; // Unix timestamp
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  spentToday?: bigint;
  lastResetTime?: number;
  whitelistedContracts: string[];
  createdAt: number;
  revoked?: boolean;
}

export interface IWalletProvider {
  getAddress(): Promise<string>;
  signMessage(message: string): Promise<string>;
  signTransaction(tx: any): Promise<string>;
  sendTransaction(tx: any): Promise<string>;
  createSessionKey(constraints: SessionKeyConstraints): Promise<SessionKeyInfo>;
}

export interface SessionKeyConstraints {
  maxSpendPerTx: bigint;
  maxSpendPerDay: bigint;
  validForSeconds: number;
  whitelistedContracts: string[];
}

