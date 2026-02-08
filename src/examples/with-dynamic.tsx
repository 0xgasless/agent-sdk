/**
 * Example: Using Agent SDK with Dynamic.xyz
 * 
 * This example shows how to integrate Agent SDK with Dynamic's wallet system.
 * Dynamic provides social login and embedded wallets.
 * 
 * NOTE: This example requires @dynamic-labs/sdk-react-core to be installed separately.
 * Install it with: npm install @dynamic-labs/sdk-react-core
 */

import { AgentSDK } from '../AgentSDK';
// @ts-expect-error - Dynamic is not a dependency of agent-sdk (wallet-agnostic)
import {
  DynamicContextProvider,
  useDynamicContext,
} from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { BrowserProvider } from 'ethers';
import { useState, useEffect } from 'react';
import React from 'react';
import { fujiConfig } from './fuji.config';

// Wrap your app with DynamicContextProvider
export function App() {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: process.env.VITE_DYNAMIC_ENV_ID || 'your-dynamic-environment-id',
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      <AgentDashboard />
    </DynamicContextProvider>
  );
}

function AgentDashboard() {
  const { primaryWallet, user, setShowAuthFlow } = useDynamicContext();
  const [sdk, setSDK] = useState<AgentSDK | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function initSDK() {
      if (!primaryWallet) return;

      try {
        setLoading(true);
        // Switch to Avalanche Fuji
        await primaryWallet.switchNetwork({
          networkChainId: 43113,
          networkName: 'Avalanche Fuji Testnet',
        });

        // Get ethers provider
        const walletClient = await primaryWallet.getWalletClient();
        const provider = new BrowserProvider(walletClient);
        const signer = await provider.getSigner();

        const address = await signer.getAddress();
        console.log('✅ Dynamic wallet connected:', address);

        // Initialize SDK
        const agentSDK = new AgentSDK({
          networks: fujiConfig.networks,
          defaultNetwork: 'fuji',
          signer,
        });

        setSDK(agentSDK);
        console.log('✅ Agent SDK initialized with Dynamic wallet');
      } catch (error: any) {
        console.error('Failed to initialize SDK:', error.message);
      } finally {
        setLoading(false);
      }
    }

    initSDK();
  }, [primaryWallet]);

  async function registerAgent() {
    if (!sdk) return;

    try {
      setLoading(true);
      const identity = sdk.erc8004.identity('fuji');
      const domain = `agent-${Date.now()}`;
      // v0.2: Use register(agentURI) instead of newAgent
      const tx = await identity.register('ipfs://QmAgentCard...');

      const receipt = await tx.wait();
      if (receipt) {
        const agentInfo = await identity.resolveByDomain(domain);
        if (agentInfo) {
          setAgentId(agentInfo.tokenId.toString());
          console.log('✅ Agent registered!');
        }
      }
    } catch (error: any) {
      console.error('Registration failed:', error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!primaryWallet) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🤖 AI Agent with Dynamic</h1>
        <p>Connect your wallet to continue</p>
        <button
          onClick={() => setShowAuthFlow(true)}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 AI Agent Dashboard</h1>
      <p>Connected: {user?.verifiedCredentials[0]?.address || primaryWallet.address}</p>

      {loading ? (
        <p>Loading...</p>
      ) : sdk ? (
        <div>
          <p>✅ SDK Ready</p>
          {!agentId ? (
            <button
              onClick={registerAgent}
              style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}
            >
              Register Agent
            </button>
          ) : (
            <p>✅ Agent Registered! ID: {agentId}</p>
          )}
        </div>
      ) : (
        <p>Initializing SDK...</p>
      )}
    </div>
  );
}

