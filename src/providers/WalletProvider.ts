import { ethers } from 'ethers';

export interface WalletConfig {
  privateKey: string;
  rpcUrl: string;
  networkId?: string;
}

export class WalletProvider {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;
  private networkId: string;

  constructor(config: WalletConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.networkId = config.networkId || 'base-sepolia';
  }

  async initialize(): Promise<void> {
    // Verify connection
    await this.provider.getNetwork();
  }

  getActiveProviderName(): string {
    return "Standard EOA (ethers)";
  }

  /**
   * Send a transaction (native or ERC20)
   * @param to Recipient address
   * @param amount Amount to send (as string, e.g. "0.1")
   * @param token Token symbol or address (ETH, AVAX, or contract address)
   */
  async sendTransaction(to: string, amount: string, token: string): Promise<string> {
    const isNative = token === 'ETH' || token === 'AVAX' || token === 'NATIVE';

    if (isNative) {
      const tx = await this.wallet.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });
      return tx.hash;
    } else {
        // Assume token is address if likely, or hardcoded for demo
        // For production CLI, we'd need a token map. 
        // For now, if it looks like an address, treat as ERC20
        if (ethers.isAddress(token)) {
            const abi = ["function transfer(address to, uint256 amount) returns (bool)", "function decimals() view returns (uint8)"];
            const contract = new ethers.Contract(token, abi, this.wallet);
            let decimals = 18;
            try { decimals = await contract.decimals(); } catch {}
            const amountWei = ethers.parseUnits(amount, decimals);
            const tx = await contract.transfer(to, amountWei);
            return tx.hash;
        } else {
            throw new Error(`Token '${token}' not supported/recognized as address. Please use contract address.`);
        }
    }
  }
}
