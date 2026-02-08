/**
 * Example: Using Agent SDK with Session Keys (In-Memory Storage)
 * 
 * This shows how to use session keys for autonomous agents with simple in-memory storage.
 * 
 * ⚠️ For production, use a real database! See:
 * - with-session-keys-database.ts (SQLite/PostgreSQL examples)
 * - DATABASE_SETUP_GUIDE.md (complete setup guide)
 * 
 * NOTE: Storage and validation is YOUR responsibility!
 */

import { AgentSDK } from '../AgentSDK';
import { SessionKeyHelper } from '../utils/SessionKeyHelper';
import { Wallet, JsonRpcProvider, parseUnits } from 'ethers';
import { fujiConfig } from './fuji.config';

// Simple in-memory storage (for development only!)
// For production, use with-session-keys-database.ts
class SimpleStorage {
  private storage: Map<string, any> = new Map();
  
  async save(sessionKey: any) {
    this.storage.set(sessionKey.address, sessionKey);
  }
  
  async load(address: string) {
    return this.storage.get(address) || null;
  }
  
  async updateSpentToday(address: string, amount: bigint) {
    const key = this.storage.get(address);
    if (key) {
      key.spentToday = (key.spentToday || 0n) + amount;
      this.storage.set(address, key);
    }
  }
  
  getSpentToday(address: string): bigint {
    const key = this.storage.get(address);
    return key?.spentToday || 0n;
  }
}

async function main() {
  console.log('🔐 Example: Using Agent SDK with Session Keys\n');
  
  // 1. User's main wallet (from any source - Privy, Dynamic, MetaMask, etc.)
  const provider = new JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
  const userWallet = new Wallet(process.env.USER_PRIVATE_KEY || '0x...', provider);
  
  console.log('✅ User wallet:', userWallet.address);
  
  // 2. Generate session key with constraints
  const sessionKey = SessionKeyHelper.generateSessionKey({
    maxSpendPerTx: parseUnits('10', 6), // 10 USDT per transaction
    maxSpendPerDay: parseUnits('100', 6), // 100 USDT per day
    validForSeconds: 7 * 24 * 60 * 60, // 7 days
    whitelistedContracts: [
      fujiConfig.networks.fuji.erc8004?.identityRegistry || '',
      fujiConfig.networks.fuji.erc8004?.reputationRegistry || '',
      fujiConfig.networks.fuji.x402?.defaultToken || '',
    ].filter(addr => addr !== ''),
  });
  
  console.log('✅ Session key generated:');
  console.log('   Address:', sessionKey.address);
  console.log('   Max spend per tx:', '10 USDT');
  console.log('   Max spend per day:', '100 USDT');
  console.log('   Valid until:', new Date(sessionKey.validUntil * 1000).toLocaleString());
  console.log('');
  
  // 3. Store session key (YOUR responsibility!)
  const storage = new SimpleStorage();
  await storage.save({
    ...sessionKey,
    spentToday: 0n,
  });
  console.log('💾 Session key stored');
  console.log('');
  
  // 4. Create wallet from session key
  const sessionWallet = SessionKeyHelper.createWallet(sessionKey, provider);
  
  // 5. Initialize SDK with session key wallet
  const sdk = new AgentSDK({
    networks: fujiConfig.networks,
    defaultNetwork: 'fuji',
    signer: sessionWallet,
  });
  
  console.log('✅ Agent SDK initialized with session key');
  console.log('   Agent address:', await sdk.getAddress());
  console.log('');
  
  // 6. Validate transaction before sending (YOUR responsibility!)
  const tx = {
    to: fujiConfig.networks.fuji.x402?.defaultToken || '',
    value: parseUnits('5', 6), // 5 USDT
  };
  
  const spentToday = storage.getSpentToday(sessionKey.address);
  const validation = SessionKeyHelper.validateTransaction(sessionKey, tx, spentToday);
  
  if (!validation.valid) {
    console.error('❌ Transaction rejected:', validation.reason);
    return;
  }
  
  console.log('✅ Transaction validated');
  console.log('   Amount:', '5 USDT');
  console.log('   Spent today:', (Number(spentToday) / 1e6).toFixed(6), 'USDT');
  console.log('');
  
  // 7. Use SDK (transaction will be sent)
  // Note: In production, you'd want to wrap sendTransaction to validate
  console.log('💡 In production, wrap sendTransaction to validate before sending');
  console.log('   See SessionKeyHelper.validateTransaction()');
  console.log('');
  
  // 8. Register agent
  console.log('📝 Registering agent...');
  try {
    const identity = sdk.erc8004.identity('fuji');
    const domain = `session-agent-${Date.now()}`;
    const agentCardURI = 'ipfs://QmAgentCard123';
    
    // v0.2: Use register(agentURI) instead of newAgent
    const tx = await identity.register(agentCardURI);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt) {
      console.log('✅ Agent registered!');
      console.log('   Transaction:', tx.hash);
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Registration failed:', error.message);
  }
  
  console.log('\n✅ Example completed!');
  console.log('\n📝 Important Notes:');
  console.log('   - Session key storage is YOUR responsibility');
  console.log('   - Validation should happen on backend too');
  console.log('   - Track daily spend in your database');
  console.log('   - Revoke keys when needed');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };

