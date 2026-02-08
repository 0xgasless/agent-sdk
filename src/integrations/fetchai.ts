import { AgentSDK } from '../AgentSDK';
import axios, { AxiosInstance } from 'axios';

export interface FetchAIConfig {
  apiKey: string;
  model?: string; // Default: 'asi1-mini'
  endpoint?: string;
}

export interface FetchAIQueryOptions {
  maxTokens?: number;
  temperature?: number;
  autoPayForData?: boolean;
}

export interface FetchAIResponse {
  response: string;
  usage: { tokens: number; cost?: number };
  paymentTxHash?: string;
}

/**
 * Fetch.ai ASI Integration
 * 
 * Provides seamless integration with Fetch.ai's ASI models
 * with automatic payment handling via x402
 */
export class FetchAIAgent {
  private sdk: AgentSDK;
  private config: FetchAIConfig;
  private client: AxiosInstance;
  
  constructor(sdk: AgentSDK, config: FetchAIConfig) {
    this.sdk = sdk;
    this.config = {
      model: 'asi1-mini',
      endpoint: 'https://api.fetch.ai/v1',
      ...config,
    };
    
    this.client = axios.create({
      baseURL: this.config.endpoint,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }
  
  /**
   * Query Fetch.ai ASI model with automatic payment handling
   */
  async query(
    prompt: string,
    options?: FetchAIQueryOptions
  ): Promise<FetchAIResponse> {
    try {
      // 1. Send query to Fetch.ai
      const response = await this.client.post('/chat/completions', {
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      });
      
      const result = response.data;
      
      // 2. Check if payment is required for premium features
      if (result.payment_required && options?.autoPayForData) {
        console.log('💰 Payment required for premium data:', {
          amount: result.payment_amount,
          recipient: result.payment_recipient,
        });
        
        // 3. Use SDK to make payment via x402
        const network = this.sdk.getNetwork();
        const facilitator = this.sdk.getFacilitator();
        const signer = this.sdk.getSigner();
        
        // Create payment payload
        const { createPaymentPayload } = await import('../x402/wallet');
        const requirements = {
          scheme: 'exact' as const,
          network: network.name,
          asset: network.x402?.defaultToken || '',
          payTo: result.payment_recipient,
          maxAmountRequired: result.payment_amount.toString(),
          maxTimeoutSeconds: 3600,
          description: 'Payment for Fetch.ai premium data',
          relayerContract: network.x402?.verifyingContract || '',
        };
        
        const payload = await createPaymentPayload(requirements, signer as any, network);
        const verifyResult = await facilitator.verify(payload, requirements);
        
        if (!verifyResult.isValid) {
          throw new Error(`Payment verification failed: ${verifyResult.invalidReason}`);
        }
        
        const settleResult = await facilitator.settle(payload, requirements);
        
        if (!settleResult.success || !settleResult.transaction) {
          throw new Error(`Payment settlement failed: ${settleResult.errorReason}`);
        }
        
        console.log('✅ Payment successful:', settleResult.transaction);
        
        // 4. Retry query with payment proof
        const paidResponse = await this.client.post('/chat/completions', {
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options?.maxTokens || 1000,
          temperature: options?.temperature || 0.7,
          payment_tx_hash: settleResult.transaction,
        });
        
        return {
          response: paidResponse.data.choices[0].message.content,
          usage: paidResponse.data.usage,
          paymentTxHash: settleResult.transaction,
        };
      }
      
      // No payment required
      return {
        response: result.choices[0].message.content,
        usage: result.usage,
      };
      
    } catch (error: any) {
      console.error('Fetch.ai query error:', error.response?.data || error.message);
      throw new Error(
        `Fetch.ai query failed: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }
  
  /**
   * Multi-turn conversation with memory
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: FetchAIQueryOptions
  ): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.config.model,
        messages,
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
      });
      
      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('Fetch.ai chat error:', error.response?.data || error.message);
      throw new Error(
        `Fetch.ai chat failed: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }
  
  /**
   * Get available models
   */
  async getModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/models');
      return response.data.data.map((model: any) => model.id);
    } catch (error: any) {
      console.error('Failed to fetch models:', error);
      return [];
    }
  }
}

