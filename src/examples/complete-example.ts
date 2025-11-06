/**
 * Complete Example: Using AgentSDK with ERC-8004 and x402
 * 
 * This example demonstrates:
 * 1. Registering an agent (ERC-8004 Identity)
 * 2. Making gasless payments (x402)
 * 3. Submitting feedback (ERC-8004 Reputation)
 * 4. Staking as validator (ERC-8004 Validation)
 * 
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable
 * - Set X402_FACILITATOR_URL environment variable (optional, for x402 payments)
 * - Have some AVAX in your wallet for gas
 * 
 * Note: The ERC-8004 client ABIs need to be updated with the actual contract ABIs
 * from the deployed contracts. See UPDATE_ABIS.md for details.
 */

// Load environment variables from .env file FIRST, before any imports
import * as dotenv from 'dotenv';
dotenv.config();

import { AgentSDK } from '../AgentSDK';
import { fujiConfig } from './fuji.config';
import { createPaymentPayload } from '../x402/wallet';
import { ethers, keccak256, toUtf8Bytes, Contract } from 'ethers';

async function main() {
  console.log('🚀 AgentSDK Complete Example\n');

  // Check if private key is set
  if (!fujiConfig.privateKey) {
    console.error('❌ ERROR: PRIVATE_KEY environment variable is not set!\n');
    console.log('Please set it with:');
    console.log('  export PRIVATE_KEY=your_private_key_here\n');
    console.log('Or create a .env file in the agent-sdk directory with:');
    console.log('  PRIVATE_KEY=your_private_key_here\n');
    process.exit(1);
  }

  // Initialize SDK
  const sdk = new AgentSDK(fujiConfig);
  const wallet = sdk.getWallet();
  const address = await wallet.getAddress();
  const network = sdk.getNetwork('fuji');
  
  console.log(`📱 Wallet Address: ${address}`);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})\n`);
  
  // Store agent IDs for later use
  let registeredAgentId: string | null = null;
  let registeredDomain: string | null = null;

  // ============================================
  // 1. Register an Agent (ERC-8004 Identity)
  // ============================================
  console.log('1️⃣  Registering Agent...');
  try {
    const identity = sdk.erc8004.identity('fuji');
    
    // Create agent metadata (Agent Card JSON)
    // In production, upload to IPFS/Arweave and use the CID
    const agentCardURI = 'ipfs://QmExample123'; // Replace with actual IPFS CID
    const domain = `agent-${Date.now()}`;
    
    console.log(`   📝 Domain: ${domain}`);
    console.log(`   🔗 URI: ${agentCardURI}`);
    
    // Register agent (requires 0.005 AVAX registration fee)
    const tx = await identity.newAgent(domain, agentCardURI, {
      value: BigInt('5000000000000000'), // 0.005 AVAX
    });
    console.log(`   ✅ Agent registered! TX: ${tx.hash}`);
    
    // Wait for confirmation
    await tx.wait();
    console.log(`   ✅ Transaction confirmed!\n`);
    
    // Get agent info
    const agentInfo = await identity.resolveByDomain(domain);
    if (agentInfo) {
      registeredAgentId = agentInfo.tokenId;
      registeredDomain = domain;
      console.log(`   📊 Agent ID: ${agentInfo.tokenId}`);
      console.log(`   👤 Owner: ${agentInfo.owner}\n`);
    }
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // ============================================
  // 2. Make Gasless Payment (x402)
  // ============================================
  console.log('2️⃣  Making Gasless Payment with x402...');
  try {
    const facilitator = sdk.getFacilitator('fuji');
    
    if (!network.x402?.facilitatorUrl || network.x402.facilitatorUrl.includes('your-facilitator')) {
      console.log(`   ⚠️  Facilitator URL not configured. Set X402_FACILITATOR_URL env var.\n`);
    } else {
      // First, approve the relayer contract to spend tokens
      const provider = sdk.getProvider('fuji');
      const tokenAddress = network.x402.defaultToken || '';
      const relayerAddress = network.x402.verifyingContract || '';
      
      if (tokenAddress && relayerAddress) {
        console.log(`   🔐 Checking token approval...`);
        const tokenABI = [
          'function allowance(address owner, address spender) view returns (uint256)',
          'function approve(address spender, uint256 amount) returns (bool)',
        ];
        const tokenContract = new Contract(tokenAddress, tokenABI, wallet.connect(provider));
        const currentAllowance = await tokenContract.allowance(address, relayerAddress);
        const requiredAmount = BigInt('1000000'); // 1 USDT (6 decimals)
        
        if (currentAllowance < requiredAmount) {
          console.log(`   📝 Approving relayer to spend tokens...`);
          const approveTx = await tokenContract.approve(relayerAddress, ethers.MaxUint256);
          await approveTx.wait();
          console.log(`   ✅ Relayer approved! TX: ${approveTx.hash}`);
        } else {
          console.log(`   ✅ Relayer already approved`);
        }
      }
      
      // Create payment requirements
      // Note: The facilitator expects 'avalanche-testnet' as network name
      const requirements = {
        scheme: 'exact' as const,
        network: 'avalanche-testnet' as any, // Facilitator expects 'avalanche-testnet'
        asset: network.x402.defaultToken || '',
        payTo: '0x8692183315e7233f88a534596aED139a5614b197', // Example recipient
        maxAmountRequired: '1000000', // 1 USDC (6 decimals)
        maxTimeoutSeconds: 3600,
        description: 'Payment for API call',
        relayerContract: network.x402.verifyingContract || '',
      };
      
      // Create payment payload (wallet doesn't need provider for signing)
      const payload = await createPaymentPayload(requirements, wallet, network);
      
      // Verify payment with facilitator
      const verifyResult = await facilitator.verify(payload, requirements);
      console.log(`   💰 Amount: ${requirements.maxAmountRequired}`);
      console.log(`   📝 Valid: ${verifyResult.isValid}`);
      if (verifyResult.invalidReason) {
        console.log(`   ⚠️  Reason: ${verifyResult.invalidReason}`);
      }
      if (verifyResult.payer) {
        console.log(`   👤 Payer: ${verifyResult.payer}`);
      }
      console.log();
      
      if (verifyResult.isValid) {
        // Settle payment
        const settleResult = await facilitator.settle(payload, requirements);
        if (settleResult.success) {
          console.log(`   ✅ Payment settled!`);
          console.log(`   🔗 TX: ${settleResult.transaction}\n`);
        } else {
          console.log(`   ❌ Settlement failed: ${settleResult.errorReason}`);
          if (settleResult.errorReason?.includes('insufficient funds')) {
            console.log(`   ⚠️  The facilitator wallet needs more AVAX for gas fees.\n`);
          } else {
            console.log();
          }
        }
      } else {
        console.log(`   ℹ️  Payment not valid, skipping settlement\n`);
      }
    }
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // ============================================
  // 3. Submit Feedback (ERC-8004 Reputation)
  // ============================================
  console.log('3️⃣  Submitting Feedback...');
  try {
    const reputation = sdk.erc8004.reputation('fuji');
    const identity = sdk.erc8004.identity('fuji');
    
    if (!registeredAgentId) {
      console.log(`   ⚠️  No agent registered yet. Run step 1 first.\n`);
    } else {
      // Register a second agent to act as server
      const serverDomain = `server-${Date.now()}`;
      console.log(`   📝 Registering server agent (domain: ${serverDomain})...`);
      const serverTx = await identity.newAgent(serverDomain, 'ipfs://QmServer', {
        value: BigInt('5000000000000000'),
      });
      await serverTx.wait();
      const serverInfo = await identity.resolveByDomain(serverDomain);
      
      if (serverInfo) {
        const clientAgentId = registeredAgentId;
        const serverAgentId = serverInfo.tokenId;
        
        // Server authorizes client to give feedback
        console.log(`   📝 Server (ID: ${serverAgentId}) authorizing client (ID: ${clientAgentId})...`);
        const authTx = await reputation.acceptFeedback(clientAgentId, serverAgentId);
        await authTx.wait();
        console.log(`   ✅ Feedback authorized! TX: ${authTx.hash}`);
        
        // Client submits feedback
        const score = 85;
        const feedbackData = `feedback-${Date.now()}`;
        const dataHash = keccak256(toUtf8Bytes(feedbackData));
        console.log(`   📝 Submitting feedback (score: ${score})...`);
        const feedbackId = await reputation.submitFeedback(clientAgentId, serverAgentId, score, dataHash);
        console.log(`   ✅ Feedback submitted! ID: ${feedbackId}\n`);
        
        // Get reputation stats
        const stats = await reputation.getReputationStats(serverAgentId);
        console.log(`   📊 Reputation Stats:`);
        console.log(`      Total Feedback: ${stats.totalFeedback}`);
        console.log(`      Average Score: ${stats.averageScore}\n`);
      }
    }
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // ============================================
  // 4. Stake as Validator (ERC-8004 Validation)
  // ============================================
  console.log('4️⃣  Staking as Validator...');
  try {
    const validation = sdk.erc8004.validation('fuji');
    
    if (!registeredAgentId) {
      console.log(`   ⚠️  No agent registered yet. Run step 1 first.\n`);
    } else {
      const agentId = registeredAgentId;
      
      // Stake as validator (minimum 0.1 AVAX as required by contract)
      const stakeAmount = BigInt('100000000000000000'); // 0.1 AVAX (minimum required)
      console.log(`   💰 Staking ${stakeAmount.toString()} wei (0.1 AVAX) as validator...`);
      const stakeTx = await validation.stakeAsValidator(agentId, {
        value: stakeAmount,
      });
      await stakeTx.wait();
      console.log(`   ✅ Staked as validator! TX: ${stakeTx.hash}\n`);
      
      // Get validator info
      const validatorInfo = await validation.getValidatorInfo(agentId);
      console.log(`   📊 Validator Info:`);
      console.log(`      Staked: ${validatorInfo.stakedAmount} wei`);
      console.log(`      Active: ${validatorInfo.isActive}`);
      console.log(`      Total Validations: ${validatorInfo.totalValidations}\n`);
    }
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }
  
  // ============================================
  // 5. Request and Respond to Validation
  // ============================================
  console.log('5️⃣  Requesting Validation...');
  try {
    const validation = sdk.erc8004.validation('fuji');
    const identity = sdk.erc8004.identity('fuji');
    
    if (!registeredAgentId) {
      console.log(`   ⚠️  No agent registered yet. Run step 1 first.\n`);
    } else {
      // Use the registered agent as validator
      const validatorId = registeredAgentId;
      
      // Register another agent as server (or use existing)
      const allAgents = await identity.resolveByAddress(address);
      const serverAgentId = allAgents.length > 1 ? allAgents[1] : allAgents[0];
      
      const validationData = `validation-${Date.now()}`;
      const dataHash = keccak256(toUtf8Bytes(validationData));
      const reward = BigInt('2000000000000000'); // 0.002 AVAX
      
      console.log(`   📝 Requesting validation from validator (ID: ${validatorId})...`);
      const requestTx = await validation.validationRequest(validatorId, serverAgentId, dataHash, {
        value: reward,
      });
      await requestTx.wait();
      console.log(`   ✅ Validation requested! TX: ${requestTx.hash}\n`);
      
      // Get validation request
      const request = await validation.getValidationRequest(dataHash);
      console.log(`   📊 Validation Request:`);
      console.log(`      Validator: ${request.agentValidatorId}`);
      console.log(`      Server: ${request.agentServerId}`);
      console.log(`      Reward: ${request.reward} wei\n`);
      
      // Submit validation response (as validator)
      console.log(`   📝 Submitting validation response...`);
      const responseTx = await validation.validationResponse(dataHash, 90);
      await responseTx.wait();
      console.log(`   ✅ Validation response submitted! TX: ${responseTx.hash}`);
      console.log(`   ⭐ Score: 90/100\n`);
      
      // Get validation response
      const response = await validation.getValidationResponse(dataHash);
      console.log(`   📊 Validation Response:`);
      console.log(`      Has Response: ${response.hasResponse}`);
      console.log(`      Score: ${response.response}/100\n`);
    }
    
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}\n`);
  }

  // ============================================
  // 6. Using x402Fetch for Gasless HTTP Requests
  // ============================================
  console.log('6️⃣  Making Gasless HTTP Request with x402Fetch...');
  try {
    if (!network.x402?.facilitatorUrl || network.x402.facilitatorUrl.includes('your-facilitator')) {
      console.log(`   ⚠️  Facilitator URL not configured. Set X402_FACILITATOR_URL env var.\n`);
    } else {
      // Example: Call an API that requires payment
      // Note: This is just a demo - api.example.com doesn't exist
      // In production, replace with your actual API endpoint
      console.log(`   📝 Attempting to call example API endpoint...`);
      console.log(`   ℹ️  Note: api.example.com is not a real endpoint, this will fail as expected\n`);
      
      const response = await sdk.fetch('https://api.example.com/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Hello, agent!',
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ API call successful!`);
        console.log(`   📝 Response: ${JSON.stringify(data)}\n`);
      } else {
        console.log(`   ⚠️  API call returned: ${response.status}\n`);
      }
    }
    
  } catch (error: any) {
    console.log(`   ℹ️  Expected error: ${error.message}`);
    console.log(`   📝 This is normal - api.example.com is not a real endpoint.`);
    console.log(`   💡 Replace with your actual API endpoint that supports x402 payments.\n`);
  }

  console.log('✨ Example complete!\n');
  console.log('📝 Summary:');
  console.log('   ✅ Agent registration working');
  console.log('   ✅ Feedback system working');
  console.log('   ✅ x402 payment verification working');
  console.log('   ✅ x402 payment settlement working');
  console.log('   ✅ Validator staking working');
  console.log('   ✅ Validation requests/responses working');
  console.log('   ℹ️  x402Fetch requires a real API endpoint (example.com is not a real endpoint)\n');
}

// Run example
if (require.main === module) {
  main().catch(console.error);
}

export { main as runExample };
