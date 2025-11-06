import { Wallet, TypedDataDomain } from 'ethers';
import { PaymentRequirements, PaymentPayload, Authorization, NetworkConfig } from '../types';

export async function createPaymentPayload(
  requirements: PaymentRequirements,
  wallet: Wallet,
  networkCfg: NetworkConfig
): Promise<PaymentPayload> {
  const now = Math.floor(Date.now() / 1000);
  const validBefore = now + requirements.maxTimeoutSeconds;

  const nonceBytes = new Uint8Array(32);
  crypto.getRandomValues(nonceBytes);
  const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const authorization: Authorization = {
    from: wallet.address,
    to: requirements.payTo,
    value: requirements.maxAmountRequired,
    validAfter: 0,
    validBefore,
    nonce
  };

  const domain: TypedDataDomain = {
    name: networkCfg.x402?.domainName || 'B402',
    version: networkCfg.x402?.domainVersion || '1',
    chainId: networkCfg.chainId,
    verifyingContract: requirements.relayerContract
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' }
    ]
  } as const;

  const signature = await wallet.signTypedData(domain, types as any, authorization as any);

  return {
    x402Version: 1,
    scheme: 'exact',
    network: requirements.network,
    token: requirements.asset,
    payload: { authorization, signature }
  };
}


