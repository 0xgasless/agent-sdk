/**
 * Example: Using Agent SDK with ethers.js Wallet
 * 
 * This is the simplest approach - just use a standard ethers Wallet.
 */

import { AgentSDK } from '../AgentSDK';
import { Wallet, JsonRpcProvider } from 'ethers';
import { fujiConfig } from './fuji.config';

async function main() {
  console.log('📝 Example: Using Agent SDK with ethers.js Wallet\n');
  
  // 1. Create wallet (developer provides this)
  const provider = new JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
  const wallet = new Wallet(process.env.PRIVATE_KEY || '0x...', provider);
  
  console.log('✅ Wallet created:', wallet.address);
  
  // 2. Initialize SDK with wallet
  const sdk = new AgentSDK({
    networks: fujiConfig.networks,
    defaultNetwork: 'fuji',
    signer: wallet,
  });
  
  console.log('✅ Agent SDK initialized');
  console.log('   Address:', await sdk.getAddress());
  console.log('');
  
  // 3. Register agent on ERC-8004
  console.log('📝 Registering agent...');
  try {
    const identity = sdk.erc8004.identity('fuji');
    const domain = `my-agent-${Date.now()}`;
    const agentCardURI = 'ipfs://QmAgentCard123';
    
    // v0.2: Use register(agentURI) instead of newAgent
    const tx = await identity.register(agentCardURI);
    
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    
    if (receipt) {
      console.log('✅ Agent registered!');
      console.log('   Transaction:', tx.hash);
      console.log('   Block:', receipt.blockNumber);
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Registration failed:', error.message);
    console.log('');
  }
  
  // 4. Make a payment via x402
  console.log('💸 Making payment via x402...');
  try {
    const facilitator = sdk.getFacilitator('fuji');
    const network = sdk.getNetwork('fuji');
    const { createPaymentPayload } = await import('../x402/wallet');
    
    const requirements = {
      scheme: 'exact' as const,
      network: 'fuji',
      asset: network.x402?.defaultToken || '',
      payTo: '0xRecipientAddress...',
      maxAmountRequired: '5000000', // 5 USDT (6 decimals)
      maxTimeoutSeconds: 3600,
      description: 'Payment example',
      relayerContract: network.x402?.verifyingContract || '',
    };
    
    const payload = await createPaymentPayload(requirements, wallet, network);
    const verifyResult = await facilitator.verify(payload, requirements);
    
    if (verifyResult.isValid) {
      const settleResult = await facilitator.settle(payload, requirements);
      if (settleResult.success) {
        console.log('✅ Payment successful!');
        console.log('   Transaction:', settleResult.transaction);
      }
    }
  } catch (error: any) {
    console.error('❌ Payment failed:', error.message);
  }
  
  console.log('\n✅ Example completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };

