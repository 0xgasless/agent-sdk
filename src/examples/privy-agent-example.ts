/**
 * Privy Agent Example (Option 1)
 * 
 * This example shows how to use the Agent SDK with Privy for production-ready
 * wallet delegation using session keys.
 */

import { AgentSDK } from '../AgentSDK';
import { FetchAIAgent } from '../integrations/fetchai';
import { fujiConfig } from './fuji.config';
import { storeSessionKey, getStoredSessionKey } from '../utils/session-storage';

async function main() {
  console.log('🤖 Creating AI Agent with Privy...\n');
  
  // Step 1: Initialize SDK with Privy wallet provider
  // In a real app, the session key would come from your backend
  // after the user logs in with Privy
  
  // For this example, we'll create a session key directly
  const sdk = new AgentSDK({
    networks: fujiConfig.networks,
    defaultNetwork: 'fuji',
    wallet: {
      provider: 'privy',
      privyAppId: process.env.PRIVY_APP_ID || 'your-privy-app-id',
      // Session key will be created below
    },
  });
  
  // Step 2: Create session key for agent
  console.log('🔐 Creating session key for agent...');
  const sessionKey = await sdk.createAgentSession({
    maxSpendPerTx: '100000000', // 100 USDT (6 decimals)
    maxSpendPerDay: '1000000000', // 1000 USDT per day
    validForDays: 7,
  });
  
  console.log('✅ Session key created:');
  console.log('   Address:', sessionKey.address);
  console.log('   Max spend per tx:', '100 USDT');
  console.log('   Max spend per day:', '1000 USDT');
  console.log('   Valid until:', new Date(sessionKey.validUntil * 1000).toLocaleString());
  console.log('   Whitelisted contracts:', sessionKey.whitelistedContracts.length);
  console.log('');
  
  // Store session key (in production, use secure storage)
  storeSessionKey('agent-1', {
    privateKey: sessionKey.privateKey,
    address: sessionKey.address,
    validUntil: sessionKey.validUntil,
    maxSpendPerTx: sessionKey.maxSpendPerTx.toString(),
    maxSpendPerDay: sessionKey.maxSpendPerDay.toString(),
    whitelistedContracts: sessionKey.whitelistedContracts,
    createdAt: sessionKey.createdAt,
    walletProvider: 'privy',
  });
  
  // Step 3: Re-initialize SDK with the session key
  const sdkWithSession = new AgentSDK({
    networks: fujiConfig.networks,
    defaultNetwork: 'fuji',
    wallet: {
      provider: 'privy',
      privyAppId: process.env.PRIVY_APP_ID || 'your-privy-app-id',
      sessionKey: sessionKey,
    },
  });
  
  const walletProvider = sdkWithSession.getWalletProvider();
  const agentAddress = await walletProvider.getAddress();
  
  console.log('✅ Agent SDK initialized');
  console.log('   Agent address:', agentAddress);
  console.log('');
  
  // Step 4: Register agent on ERC-8004
  console.log('📝 Registering agent on ERC-8004...');
  try {
    const identity = sdkWithSession.erc8004.identity('fuji');
    const domain = `my-ai-agent-${Date.now()}`;
    const agentCardURI = 'ipfs://QmAgentCard123';
    
    // Note: This requires the session key wallet to have AVAX for gas
    // In production, you might use a paymaster for gasless transactions
    // v0.2: Use register(agentURI) instead of newAgent(domain, uri, ...)
    const tx = await identity.register(agentCardURI);
    
    console.log('⏳ Waiting for transaction confirmation...');
    const receipt = await tx.wait();
    
    if (receipt) {
      console.log('✅ Agent registered!');
      console.log('   Transaction hash:', tx.hash);
      console.log('   Block number:', receipt.blockNumber);
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Registration failed:', error.message);
    console.log('   Note: Make sure the session key wallet has AVAX for gas');
    console.log('');
  }
  
  // Step 5: Initialize Fetch.ai integration
  console.log('🧠 Connecting to Fetch.ai ASI...');
  if (!process.env.FETCHAI_API_KEY) {
    console.log('⚠️  FETCHAI_API_KEY not set, skipping Fetch.ai integration');
    console.log('');
  } else {
    const fetchAgent = new FetchAIAgent(sdkWithSession, {
      apiKey: process.env.FETCHAI_API_KEY,
      model: 'asi1-mini',
    });
    
    // Step 6: Query with automatic payment
    console.log('🔍 Querying Fetch.ai model...');
    try {
      const result = await fetchAgent.query(
        'What are the current DeFi trends on Avalanche?',
        { autoPayForData: true }
      );
      
      console.log('📊 Result:', result.response);
      if (result.paymentTxHash) {
        console.log('💰 Payment made:', result.paymentTxHash);
      }
      console.log('   Tokens used:', result.usage.tokens);
      console.log('');
    } catch (error: any) {
      console.error('❌ Fetch.ai query failed:', error.message);
      console.log('');
    }
  }
  
  // Step 7: Make a payment via x402 (example)
  console.log('💸 Example: Making payment via x402...');
  console.log('   (This would make a payment to a recipient)');
  console.log('   Use sdk.x402.pay() method for actual payments');
  console.log('');
  
  console.log('✅ Example completed!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Integrate Privy login in your frontend');
  console.log('   2. Create session keys via backend API');
  console.log('   3. Use session keys in Agent SDK');
  console.log('   4. Deploy to production');
}

// Run example
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Example failed:', error);
    process.exit(1);
  });
}

export { main };

