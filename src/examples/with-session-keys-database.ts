/**
 * Example: Using Agent SDK with Session Keys + Database
 * 
 * This shows how to use session keys with a real database (PostgreSQL/SQLite/MongoDB).
 * Replace SimpleStorage with your database implementation.
 */

import { AgentSDK } from '../AgentSDK';
import { SessionKeyHelper } from '../utils/SessionKeyHelper';
import { Wallet, JsonRpcProvider, parseUnits } from 'ethers';
import { fujiConfig } from './fuji.config';
import crypto from 'crypto';

// ============================================================================
// Encryption Utilities (CRITICAL - Always encrypt private keys!)
// ============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'); // 32 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// ============================================================================
// Database Storage Interface
// ============================================================================

interface SessionKeyData {
  id: string;
  privateKey: string; // Encrypted!
  address: string;
  parentAddress: string;
  validUntil: number;
  maxSpendPerTx: string;
  maxSpendPerDay: string;
  spentToday: string;
  lastResetTime: number;
  whitelistedContracts: string; // JSON array
  createdAt: number;
  revoked: boolean;
}

interface DatabaseStorage {
  save(data: SessionKeyData): Promise<void>;
  load(address: string): Promise<SessionKeyData | null>;
  updateSpentToday(address: string, amount: string): Promise<void>;
  revoke(address: string): Promise<void>;
  getAllForParent(parentAddress: string): Promise<SessionKeyData[]>;
}

// ============================================================================
// Option 1: SQLite (Simple, No Setup Required)
// ============================================================================

import Database from 'better-sqlite3';

class SQLiteStorage implements DatabaseStorage {
  private db: Database.Database;

  constructor(dbPath: string = 'session-keys.db') {
    this.db = new Database(dbPath);
    this.initTable();
  }

  private initTable() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_keys (
        id TEXT PRIMARY KEY,
        private_key TEXT NOT NULL,
        address TEXT UNIQUE NOT NULL,
        parent_address TEXT NOT NULL,
        valid_until INTEGER NOT NULL,
        max_spend_per_tx TEXT NOT NULL,
        max_spend_per_day TEXT NOT NULL,
        spent_today TEXT DEFAULT '0',
        last_reset_time INTEGER NOT NULL,
        whitelisted_contracts TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        revoked INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_parent ON session_keys(parent_address);
      CREATE INDEX IF NOT EXISTS idx_address ON session_keys(address);
      CREATE INDEX IF NOT EXISTS idx_valid_until ON session_keys(valid_until);
    `);
  }

  async save(data: SessionKeyData): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO session_keys 
      (id, private_key, address, parent_address, valid_until, max_spend_per_tx, 
       max_spend_per_day, spent_today, last_reset_time, whitelisted_contracts, 
       created_at, revoked)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      data.id,
      data.privateKey,
      data.address,
      data.parentAddress,
      data.validUntil,
      data.maxSpendPerTx,
      data.maxSpendPerDay,
      data.spentToday,
      data.lastResetTime,
      data.whitelistedContracts,
      data.createdAt,
      data.revoked ? 1 : 0
    );
  }

  async load(address: string): Promise<SessionKeyData | null> {
    const stmt = this.db.prepare('SELECT * FROM session_keys WHERE address = ?');
    const row = stmt.get(address) as any;
    
    if (!row) return null;
    
    return {
      id: row.id,
      privateKey: row.private_key,
      address: row.address,
      parentAddress: row.parent_address,
      validUntil: row.valid_until,
      maxSpendPerTx: row.max_spend_per_tx,
      maxSpendPerDay: row.max_spend_per_day,
      spentToday: row.spent_today,
      lastResetTime: row.last_reset_time,
      whitelistedContracts: row.whitelisted_contracts,
      createdAt: row.created_at,
      revoked: row.revoked === 1,
    };
  }

  async updateSpentToday(address: string, amount: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE session_keys 
      SET spent_today = ?, last_reset_time = ? 
      WHERE address = ?
    `);
    stmt.run(amount, Date.now(), address);
  }

  async revoke(address: string): Promise<void> {
    const stmt = this.db.prepare('UPDATE session_keys SET revoked = 1 WHERE address = ?');
    stmt.run(address);
  }

  async getAllForParent(parentAddress: string): Promise<SessionKeyData[]> {
    const stmt = this.db.prepare('SELECT * FROM session_keys WHERE parent_address = ?');
    const rows = stmt.all(parentAddress) as any[];
    
    return rows.map(row => ({
      id: row.id,
      privateKey: row.private_key,
      address: row.address,
      parentAddress: row.parent_address,
      validUntil: row.valid_until,
      maxSpendPerTx: row.max_spend_per_tx,
      maxSpendPerDay: row.max_spend_per_day,
      spentToday: row.spent_today,
      lastResetTime: row.last_reset_time,
      whitelistedContracts: row.whitelisted_contracts,
      createdAt: row.created_at,
      revoked: row.revoked === 1,
    }));
  }
}

// ============================================================================
// Option 2: PostgreSQL with Prisma (Production Ready)
// ============================================================================

/*
// Install: npm install prisma @prisma/client
// Setup: npx prisma init
// Create schema in prisma/schema.prisma, then: npx prisma migrate dev

import { PrismaClient } from '@prisma/client';

class PrismaStorage implements DatabaseStorage {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async save(data: SessionKeyData): Promise<void> {
    await this.prisma.sessionKey.upsert({
      where: { address: data.address },
      create: {
        id: data.id,
        privateKey: data.privateKey,
        address: data.address,
        parentAddress: data.parentAddress,
        validUntil: BigInt(data.validUntil),
        maxSpendPerTx: data.maxSpendPerTx,
        maxSpendPerDay: data.maxSpendPerDay,
        spentToday: data.spentToday,
        lastResetTime: BigInt(data.lastResetTime),
        whitelistedContracts: data.whitelistedContracts,
        createdAt: BigInt(data.createdAt),
        revoked: data.revoked,
      },
      update: {
        privateKey: data.privateKey,
        spentToday: data.spentToday,
        lastResetTime: BigInt(data.lastResetTime),
        revoked: data.revoked,
      },
    });
  }

  async load(address: string): Promise<SessionKeyData | null> {
    const stored = await this.prisma.sessionKey.findUnique({
      where: { address },
    });
    
    if (!stored) return null;
    
    return {
      id: stored.id,
      privateKey: stored.privateKey,
      address: stored.address,
      parentAddress: stored.parentAddress,
      validUntil: Number(stored.validUntil),
      maxSpendPerTx: stored.maxSpendPerTx,
      maxSpendPerDay: stored.maxSpendPerDay,
      spentToday: stored.spentToday,
      lastResetTime: Number(stored.lastResetTime),
      whitelistedContracts: stored.whitelistedContracts,
      createdAt: Number(stored.createdAt),
      revoked: stored.revoked,
    };
  }

  async updateSpentToday(address: string, amount: string): Promise<void> {
    await this.prisma.sessionKey.update({
      where: { address },
      data: {
        spentToday: amount,
        lastResetTime: BigInt(Date.now()),
      },
    });
  }

  async revoke(address: string): Promise<void> {
    await this.prisma.sessionKey.update({
      where: { address },
      data: { revoked: true },
    });
  }

  async getAllForParent(parentAddress: string): Promise<SessionKeyData[]> {
    const stored = await this.prisma.sessionKey.findMany({
      where: { parentAddress },
    });
    
    return stored.map(s => ({
      id: s.id,
      privateKey: s.privateKey,
      address: s.address,
      parentAddress: s.parentAddress,
      validUntil: Number(s.validUntil),
      maxSpendPerTx: s.maxSpendPerTx,
      maxSpendPerDay: s.maxSpendPerDay,
      spentToday: s.spentToday,
      lastResetTime: Number(s.lastResetTime),
      whitelistedContracts: s.whitelistedContracts,
      createdAt: Number(s.createdAt),
      revoked: s.revoked,
    }));
  }
}
*/

// ============================================================================
// Session Key Manager (Uses Database)
// ============================================================================

class SessionKeyManager {
  private storage: DatabaseStorage;

  constructor(storage: DatabaseStorage) {
    this.storage = storage;
  }

  async createSessionKey(
    parentAddress: string,
    constraints: {
      maxSpendPerTx: bigint;
      maxSpendPerDay: bigint;
      validForSeconds: number;
      whitelistedContracts: string[];
    }
  ) {
    // Generate session key
    const sessionKey = SessionKeyHelper.generateSessionKey(constraints);
    
    // Encrypt private key
    const encryptedPrivateKey = encrypt(sessionKey.privateKey);
    
    // Save to database
    await this.storage.save({
      id: crypto.randomUUID(),
      privateKey: encryptedPrivateKey, // Encrypted!
      address: sessionKey.address,
      parentAddress,
      validUntil: sessionKey.validUntil,
      maxSpendPerTx: sessionKey.maxSpendPerTx.toString(),
      maxSpendPerDay: sessionKey.maxSpendPerDay.toString(),
      spentToday: '0',
      lastResetTime: Date.now(),
      whitelistedContracts: JSON.stringify(sessionKey.whitelistedContracts),
      createdAt: Date.now(),
      revoked: false,
    });
    
    return sessionKey;
  }

  async loadSessionKey(address: string) {
    const stored = await this.storage.load(address);
    
    if (!stored || stored.revoked) {
      return null;
    }
    
    // Check if expired
    if (Date.now() / 1000 > stored.validUntil) {
      return null;
    }
    
    // Decrypt private key
    const privateKey = decrypt(stored.privateKey);
    
    // Reset daily spend if needed
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    if (now - stored.lastResetTime > oneDay) {
      await this.storage.updateSpentToday(address, '0');
      stored.spentToday = '0';
      stored.lastResetTime = now;
    }
    
    return {
      id: stored.id,
      privateKey,
      address: stored.address,
      validUntil: stored.validUntil,
      maxSpendPerTx: BigInt(stored.maxSpendPerTx),
      maxSpendPerDay: BigInt(stored.maxSpendPerDay),
      whitelistedContracts: JSON.parse(stored.whitelistedContracts),
      spentToday: BigInt(stored.spentToday),
      createdAt: stored.createdAt,
    };
  }

  async validateAndUpdateSpent(address: string, amount: bigint): Promise<{ valid: boolean; reason?: string }> {
    const sessionKey = await this.loadSessionKey(address);
    
    if (!sessionKey) {
      return { valid: false, reason: 'Session key not found or expired' };
    }
    
    // Check per-transaction limit
    if (amount > sessionKey.maxSpendPerTx) {
      return { valid: false, reason: `Amount exceeds per-transaction limit (${sessionKey.maxSpendPerTx})` };
    }
    
    // Check daily limit
    const newSpentToday = sessionKey.spentToday + amount;
    if (newSpentToday > sessionKey.maxSpendPerDay) {
      return { valid: false, reason: `Amount exceeds daily limit (${sessionKey.maxSpendPerDay})` };
    }
    
    // Update spent amount
    await this.storage.updateSpentToday(address, newSpentToday.toString());
    
    return { valid: true };
  }

  async revokeSessionKey(address: string): Promise<void> {
    await this.storage.revoke(address);
  }
}

// ============================================================================
// Main Example
// ============================================================================

async function main() {
  console.log('🔐 Example: Using Agent SDK with Session Keys + Database\n');
  
  // 1. Initialize database storage
  // Option A: SQLite (simple, no setup)
  const storage = new SQLiteStorage('session-keys.db');
  
  // Option B: PostgreSQL with Prisma (uncomment and use)
  // const storage = new PrismaStorage();
  
  const sessionKeyManager = new SessionKeyManager(storage);
  
  // 2. User's main wallet
  const provider = new JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
  const userWallet = new Wallet(process.env.USER_PRIVATE_KEY || '0x...', provider);
  
  console.log('✅ User wallet:', userWallet.address);
  
  // 3. Create session key (saved to database)
  console.log('\n🔑 Creating session key...');
  const sessionKey = await sessionKeyManager.createSessionKey(
    userWallet.address,
    {
      maxSpendPerTx: parseUnits('10', 6), // 10 USDT per transaction
      maxSpendPerDay: parseUnits('100', 6), // 100 USDT per day
      validForSeconds: 7 * 24 * 60 * 60, // 7 days
      whitelistedContracts: [
        fujiConfig.networks.fuji.erc8004?.identityRegistry || '',
        fujiConfig.networks.fuji.erc8004?.reputationRegistry || '',
        fujiConfig.networks.fuji.x402?.defaultToken || '',
      ].filter(addr => addr !== ''),
    }
  );
  
  console.log('✅ Session key created and saved to database:');
  console.log('   Address:', sessionKey.address);
  console.log('   Max spend per tx: 10 USDT');
  console.log('   Max spend per day: 100 USDT');
  console.log('   Valid until:', new Date(sessionKey.validUntil * 1000).toLocaleString());
  
  // 4. Load session key from database
  console.log('\n📂 Loading session key from database...');
  const loaded = await sessionKeyManager.loadSessionKey(sessionKey.address);
  
  if (!loaded) {
    console.error('❌ Failed to load session key');
    return;
  }
  
  console.log('✅ Session key loaded from database');
  
  // 5. Create wallet from loaded session key
  const sessionWallet = SessionKeyHelper.createWallet(loaded, provider);
  
  // 6. Initialize SDK with session key wallet
  const sdk = new AgentSDK({
    networks: fujiConfig.networks,
    defaultNetwork: 'fuji',
    signer: sessionWallet,
  });
  
  console.log('✅ Agent SDK initialized with session key from database');
  console.log('   Agent address:', await sdk.getAddress());
  
  // 7. Validate transaction (checks database for limits)
  console.log('\n✅ Validating transaction...');
  const tx = {
    to: fujiConfig.networks.fuji.x402?.defaultToken || '',
    value: parseUnits('5', 6), // 5 USDT
  };
  
  const validation = await sessionKeyManager.validateAndUpdateSpent(
    sessionKey.address,
    tx.value
  );
  
  if (!validation.valid) {
    console.error('❌ Transaction rejected:', validation.reason);
    return;
  }
  
  console.log('✅ Transaction validated and daily spend updated in database');
  console.log('   Amount: 5 USDT');
  
  // 8. Use SDK (transaction will be sent)
  console.log('\n💡 Transaction validated - can now proceed with SDK operations');
  console.log('   Daily spend tracked in database');
  
  // 9. Example: Register agent
  console.log('\n📝 Registering agent...');
  try {
    const identity = sdk.erc8004.identity('fuji');
    const domain = `db-agent-${Date.now()}`;
    const agentCardURI = 'ipfs://QmAgentCard123';
    
    // v0.2: Use register(agentURI) instead of newAgent
    const tx = await identity.register(agentCardURI);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt) {
      console.log('✅ Agent registered!');
      console.log('   Transaction:', tx.hash);
    }
  } catch (error: any) {
    console.error('❌ Registration failed:', error.message);
  }
  
  console.log('\n✅ Example completed!');
  console.log('\n📝 Database Features:');
  console.log('   ✅ Session keys stored in database');
  console.log('   ✅ Private keys encrypted');
  console.log('   ✅ Daily spend tracked');
  console.log('   ✅ Automatic daily reset');
  console.log('   ✅ Revocation support');
}

if (require.main === module) {
  main().catch(console.error);
}

export { SessionKeyManager, SQLiteStorage, DatabaseStorage };

