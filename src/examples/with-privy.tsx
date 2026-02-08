/**
 * Example: Using Agent SDK with Privy
 * 
 * This example shows how to integrate Agent SDK with Privy's embedded wallets.
 * Privy provides social login and embedded wallet management.
 * 
 * NOTE: This example requires @privy-io/react-auth to be installed separately.
 * Install it with: npm install @privy-io/react-auth
 */

import { AgentSDK } from '../AgentSDK';
// @ts-expect-error - Privy is not a dependency of agent-sdk (wallet-agnostic)
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { BrowserProvider } from 'ethers';
import { useState, useEffect } from 'react';
import React from 'react';
import { fujiConfig } from './fuji.config';

// Wrap your app with PrivyProvider
export function App() {
  return (
    <PrivyProvider
      appId={process.env.VITE_PRIVY_APP_ID || 'your-privy-app-id'}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#6A6FF5',
        },
      }}
    >
      <AgentDashboard />
    </PrivyProvider>
  );
}

function AgentDashboard() {
  const { ready, authenticated, login, user } = usePrivy();
  const { wallets } = useWallets();
  const [sdk, setSDK] = useState<AgentSDK | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize SDK when wallet is ready
  useEffect(() => {
    async function initSDK() {
      if (!authenticated || !wallets[0]) return;

      try {
        setLoading(true);
        // Get Privy's embedded wallet
        const embeddedWallet = wallets[0];
        await embeddedWallet.switchChain(43113); // Avalanche Fuji

        // Get ethers provider and signer
        const ethersProvider = await embeddedWallet.getEthersProvider();
        const provider = new BrowserProvider(ethersProvider);
        const signer = await provider.getSigner();

        const address = await signer.getAddress();
        console.log('✅ Privy wallet connected:', address);

        // Initialize Agent SDK
        const agentSDK = new AgentSDK({
          networks: fujiConfig.networks,
          defaultNetwork: 'fuji',
          signer,
        });

        setSDK(agentSDK);
        console.log('✅ Agent SDK initialized with Privy wallet');
      } catch (error) {
        console.error('Failed to initialize SDK:', error);
      } finally {
        setLoading(false);
      }
    }

    initSDK();
  }, [authenticated, wallets]);

  async function registerAgent() {
    if (!sdk) return;

    try {
      setLoading(true);
      console.log('📝 Registering agent...');
      const identity = sdk.erc8004.identity('fuji');
      const domain = `agent-${user?.email || 'user'}-${Date.now()}`;
      // v0.2: Use register(agentURI) instead of newAgent
      const tx = await identity.register('ipfs://QmAgentCard...');

      const receipt = await tx.wait();
      if (receipt) {
        const agentInfo = await identity.resolveByDomain(domain);
        if (agentInfo) {
          setAgentId(agentInfo.tokenId.toString());
          console.log('✅ Agent registered! ID:', agentInfo.tokenId.toString());
        }
      }
    } catch (error: any) {
      console.error('Failed to register agent:', error.message);
      alert(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function makePayment() {
    if (!sdk) return;

    try {
      setLoading(true);
      console.log('💸 Making payment...');
      const facilitator = sdk.getFacilitator('fuji');
      const network = sdk.getNetwork('fuji');
      const signer = sdk.getSigner();
      const { createPaymentPayload } = await import('../x402/wallet');

      const requirements = {
        scheme: 'exact' as const,
        network: 'fuji',
        asset: network.x402?.defaultToken || '',
        payTo: '0xRecipientAddress...',
        maxAmountRequired: '5000000', // 5 USDT (6 decimals)
        maxTimeoutSeconds: 3600,
        description: 'Payment from agent',
        relayerContract: network.x402?.verifyingContract || '',
      };

      const payload = await createPaymentPayload(requirements, signer as any, network);
      const verifyResult = await facilitator.verify(payload, requirements);

      if (verifyResult.isValid) {
        const settleResult = await facilitator.settle(payload, requirements);
        if (settleResult.success && settleResult.transaction) {
          console.log('✅ Payment successful!', settleResult.transaction);
          alert(`Payment successful! TX: ${settleResult.transaction}`);
        }
      }
    } catch (error: any) {
      console.error('Payment failed:', error.message);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return <div>Loading Privy...</div>;
  }

  if (!authenticated) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🤖 AI Agent with Privy</h1>
        <p>Login to create and manage your AI agent</p>
        <button onClick={login} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Login with Privy
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 AI Agent Dashboard</h1>
      <p>Logged in as: {user?.email || user?.wallet?.address}</p>

      {loading ? (
        <p>Loading...</p>
      ) : sdk ? (
        <div>
          <p>✅ SDK Ready</p>
          <p>Agent Address: {wallets[0]?.address}</p>

          {!agentId ? (
            <button
              onClick={registerAgent}
              style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}
            >
              Register Agent
            </button>
          ) : (
            <div>
              <p>✅ Agent Registered! ID: {agentId}</p>
              <button
                onClick={makePayment}
                style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}
              >
                Make Payment (5 USDT)
              </button>
            </div>
          )}
        </div>
      ) : (
        <p>Initializing SDK...</p>
      )}
    </div>
  );
}

