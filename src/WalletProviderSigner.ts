import { AbstractSigner, Signer, Provider, TransactionRequest, TransactionResponse, TypedDataDomain, TypedDataField } from 'ethers';
import { IWalletProvider } from './wallet/types';

/**
 * Adapter to make IWalletProvider compatible with ethers.Signer
 */
export class WalletProviderSigner extends AbstractSigner {
  declare readonly provider: Provider | null;
  readonly walletProvider: IWalletProvider;
  
  constructor(walletProvider: IWalletProvider, provider: Provider | null) {
    super(provider);
    this.walletProvider = walletProvider;
    this.provider = provider;
  }
  
  async getAddress(): Promise<string> {
    return this.walletProvider.getAddress();
  }
  
  async signMessage(message: string | Uint8Array): Promise<string> {
    // Convert Uint8Array to string if needed, or pass as is if provider supports it
    // Assuming message is string for now as per IWalletProvider interface
    const msgString = typeof message === 'string' ? message : new TextDecoder().decode(message);
    return this.walletProvider.signMessage(msgString);
  }
  
  async signTransaction(tx: TransactionRequest): Promise<string> {
    return this.walletProvider.signTransaction(tx);
  }
  
  // Required by AbstractSigner but effectively handled by sendTransaction usually
  async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
    const hash = await this.walletProvider.sendTransaction(tx);
    
    // We need to return a TransactionResponse
    // If we have a provider, we can fetch the tx
    if (this.provider) {
      const txResponse = await this.provider.getTransaction(hash);
      if (txResponse) return txResponse;
    }
    
    // Mock response if provider can't find it immediately (e.g. slight delay)
    // or if no provider attached
    return {
      hash,
      wait: async () => ((this.provider ? await this.provider.waitForTransaction(hash) : null) as any),
    } as TransactionResponse; // Casting as partial response
  }
  
  connect(provider: Provider | null): Signer {
    return new WalletProviderSigner(this.walletProvider, provider);
  }

  async signTypedData(domain: TypedDataDomain, types: Record<string, TypedDataField[]>, value: Record<string, any>): Promise<string> {
    // If wallet provider supports typed data signing, use it
    if ('signTypedData' in this.walletProvider && typeof (this.walletProvider as any).signTypedData === 'function') {
      return (this.walletProvider as any).signTypedData(domain, types, value);
    }
    
    // Fallback: This is tricky because AbstractSigner doesn't expose _signTypedData easily without private key access
    // But many providers (like Privy/Safe) expose a signTypedData method.
    // If the underlying provider is missing it, we error.
    throw new Error("signTypedData not supported by this wallet provider"); 
  }
}
