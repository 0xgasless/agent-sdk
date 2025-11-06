import { FacilitatorClient } from './facilitatorClient';
import { createPaymentPayload } from './wallet';
import { NetworkConfig, PaymentRequirements, PaymentPayload } from '../types';
import { Wallet } from 'ethers';

export interface X402HttpClientOptions {
  facilitator: FacilitatorClient;
  networkCfg: NetworkConfig;
  wallet: Wallet;
}

/**
 * Minimal x402-aware fetch wrapper:
 * - Performs initial request
 * - If 402, expects JSON body with paymentRequirements
 * - Signs and settles payment
 * - Retries original request with x402-payment header
 */
export async function x402Fetch(input: RequestInfo | URL, init: RequestInit | undefined, opts: X402HttpClientOptions): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 402) return first;

  let reqs: PaymentRequirements | undefined;
  try {
    const body = await first.json();
    reqs = body?.paymentRequirements || body?.requirements;
  } catch {}

  if (!reqs) {
    return new Response(JSON.stringify({ error: '402 without payment requirements' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const payload: PaymentPayload = await createPaymentPayload(reqs, opts.wallet, opts.networkCfg);

  const verify = await opts.facilitator.verify(payload, reqs);
  if (!verify.isValid) {
    return new Response(JSON.stringify({ error: `x402 verify failed: ${verify.invalidReason}` }), { status: 402, headers: { 'Content-Type': 'application/json' } });
  }

  const settle = await opts.facilitator.settle(payload, reqs);
  if (!settle.success || !settle.transaction) {
    return new Response(JSON.stringify({ error: `x402 settle failed: ${settle.errorReason}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }

  const headers = new Headers(init?.headers || {});
  headers.set('x402-payment', settle.transaction);

  return fetch(input, { ...(init || {}), headers });
}


