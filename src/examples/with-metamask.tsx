/**
 * Example: Using Agent SDK with MetaMask
 * 
 * This example shows how to integrate Agent SDK with MetaMask browser extension.
 * 
 * NOTE: This example requires MetaMask browser extension to be installed.
 */

import { AgentSDK } from '../AgentSDK';
import { BrowserProvider } from 'ethers';
// @ts-expect-error - React types not included in SDK (wallet-agnostic)
import { useState, useEffect } from 'react';
import React from 'react';
import { fujiConfig } from './fuji.config';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      isMetaMask?: boolean;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export function App() {
  const [sdk, setSDK] = useState<AgentSDK | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if already connected
  useEffect(() => {
    async function checkConnection() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectMetaMask();
          }
        } catch (error) {
          console.error('Error checking connection:', error);
        }
      }
    }
    checkConnection();
  }, []);

  async function connectMetaMask() {
    if (!window.ethereum) {
      alert('MetaMask is not installed! Please install MetaMask extension.');
      return;
    }

    try {
      setLoading(true);
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Switch to Avalanche Fuji
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xA869' }], // 43113 in hex
        });
      } catch (switchError: any) {
        // Chain not added, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xA869',
                chainName: 'Avalanche Fuji Testnet',
                nativeCurrency: {
                  name: 'AVAX',
                  symbol: 'AVAX',
                  decimals: 18,
                },
                rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
                blockExplorerUrls: ['https://testnet.snowtrace.io/'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      // Get ethers provider
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      console.log('✅ MetaMask connected:', address);
      setAccount(address);

      // Initialize SDK
      const agentSDK = new AgentSDK({
        networks: fujiConfig.networks,
        defaultNetwork: 'fuji',
        signer,
      });

      setSDK(agentSDK);
      console.log('✅ Agent SDK initialized with MetaMask');
    } catch (error: any) {
      console.error('Failed to connect MetaMask:', error);
      alert(`Connection failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function registerAgent() {
    if (!sdk) return;

    try {
      setLoading(true);
      const identity = sdk.erc8004.identity('fuji');
      const domain = `metamask-agent-${Date.now()}`;
      // v0.2: Use register(agentURI) instead of newAgent
      const tx = await identity.register('ipfs://QmAgentCard...');

      const receipt = await tx.wait();
      if (receipt) {
        console.log('✅ Agent registered!');
        alert('Agent registered successfully!');
      }
    } catch (error: any) {
      console.error('Registration failed:', error.message);
      alert(`Registration failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!window.ethereum) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🤖 AI Agent with MetaMask</h1>
        <p>MetaMask is not installed</p>
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6A6FF5', textDecoration: 'underline' }}
        >
          Install MetaMask
        </a>
      </div>
    );
  }

  if (!account) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>🤖 AI Agent with MetaMask</h1>
        <button
          onClick={connectMetaMask}
          disabled={loading}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          {loading ? 'Connecting...' : 'Connect MetaMask'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🤖 AI Agent Dashboard</h1>
      <p>Connected: {account}</p>

      {loading ? (
        <p>Loading...</p>
      ) : sdk ? (
        <div>
          <p>✅ SDK Ready</p>
          <button
            onClick={registerAgent}
            disabled={loading}
            style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}
          >
            {loading ? 'Registering...' : 'Register Agent'}
          </button>
        </div>
      ) : (
        <p>Initializing SDK...</p>
      )}
    </div>
  );
}

