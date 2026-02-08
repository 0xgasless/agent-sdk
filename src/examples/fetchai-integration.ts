/**
 * Fetch.ai ASI Integration Example
 * 
 * Demonstrates how to use Fetch.ai models with automatic payment handling
 */

import { AgentSDK } from '../AgentSDK';
import { FetchAIAgent } from '../integrations/fetchai';
import { fujiConfig } from './fuji.config';

async function fetchAIExample() {
  console.log('🧠 Fetch.ai ASI Integration Example\n');
  
  // Initialize SDK (with session key or private key)
  const sdk = new AgentSDK({
    networks: fujiConfig.networks,
    defaultNetwork: 'fuji',
    // Use wallet config for production, or privateKey for testing
    wallet: {
      provider: 'eoa',
      privateKey: process.env.PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY,
    }
  });
  
  if (!process.env.FETCHAI_API_KEY) {
    console.error('❌ FETCHAI_API_KEY environment variable not set!');
    console.log('   Set it with: export FETCHAI_API_KEY=your_key_here');
    process.exit(1);
  }
  
  // Initialize Fetch.ai agent
  const fetchAgent = new FetchAIAgent(sdk, {
    apiKey: process.env.FETCHAI_API_KEY,
    model: 'asi1-mini', // or 'asi1-pro' for more powerful model
    endpoint: 'https://api.fetch.ai/v1', // Default endpoint
  });
  
  // Example 1: Simple query
  console.log('📝 Example 1: Simple Query');
  console.log('─────────────────────────────');
  try {
    const result = await fetchAgent.query(
      'Explain what ERC-8004 is in simple terms.',
      {
        maxTokens: 500,
        temperature: 0.7,
      }
    );
    
    console.log('Response:', result.response);
    console.log('Tokens used:', result.usage.tokens);
    console.log('');
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('');
  }
  
  // Example 2: Query with automatic payment
  console.log('💰 Example 2: Query with Auto-Payment');
  console.log('─────────────────────────────────────');
  try {
    const result = await fetchAgent.query(
      'What are the latest DeFi protocols on Avalanche? Provide detailed analysis.',
      {
        maxTokens: 1000,
        autoPayForData: true, // Automatically pay if premium data is required
      }
    );
    
    console.log('Response:', result.response);
    if (result.paymentTxHash) {
      console.log('✅ Payment made:', result.paymentTxHash);
      console.log('   View on explorer:', 
        `https://testnet.snowscan.xyz/tx/${result.paymentTxHash}`);
    }
    console.log('Tokens used:', result.usage.tokens);
    console.log('');
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('');
  }
  
  // Example 3: Multi-turn conversation
  console.log('💬 Example 3: Multi-turn Conversation');
  console.log('───────────────────────────────────────');
  try {
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      { role: 'user', content: 'What is x402?' },
    ];
    
    // First message
    let response = await fetchAgent.chat(messages);
    console.log('User: What is x402?');
    console.log('AI:', response);
    console.log('');
    
    // Follow-up
    messages.push({ role: 'assistant' as const, content: response });
    messages.push({ role: 'user' as const, content: 'How does it work with ERC-8004?' });
    
    response = await fetchAgent.chat(messages);
    console.log('User: How does it work with ERC-8004?');
    console.log('AI:', response);
    console.log('');
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('');
  }
  
  // Example 4: Get available models
  console.log('📋 Example 4: Available Models');
  console.log('───────────────────────────────');
  try {
    const models = await fetchAgent.getModels();
    console.log('Available models:', models);
    console.log('');
  } catch (error: any) {
    console.error('Error:', error.message);
    console.log('');
  }
  
  console.log('✅ Fetch.ai integration example completed!');
}

// Run example
if (require.main === module) {
  fetchAIExample().catch((error) => {
    console.error('❌ Example failed:', error);
    process.exit(1);
  });
}

export { fetchAIExample };

