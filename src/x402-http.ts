/**
 * Standard x402 wire-format helpers + the HTTP payment flow.
 *
 * Everything in this module is ADDITIVE: `x402.sign()` / `x402.pay()` and the
 * facilitator payload formats are untouched. This module converts between the
 * platform's payload shape and the x402 standard wire format so agents can pay
 * ANY 402-responding endpoint on the internet, not just the 0xgasless
 * facilitator:
 *
 *   - `toX402Envelope(signed)`     — wrap a signed payment in the standard
 *                                    `{x402Version, scheme, network, payload}`
 *                                    envelope merchants expect.
 *   - `encodeXPaymentHeader(env)`  — base64 for the `X-PAYMENT` request header.
 *   - `X402Api.payFetch(url, …)`   — the full client flow:
 *                                    request → 402 → parse requirements →
 *                                    policy-checked KMS sign → retry with
 *                                    `X-PAYMENT` → resource.
 *
 * Settlement note: with `payFetch` the MERCHANT settles (that's the x402
 * model — the receiving side chooses its facilitator). When the merchant is a
 * 0xgasless-facilitator-backed service, settlement runs through
 * x402.0xgasless.com as usual.
 */
import type { Chain, SignX402Response } from './types.js';
import { isSvmPayload } from './types.js';

/** Standard x402 payment envelope — what goes (base64-encoded) into `X-PAYMENT`. */
export interface X402Envelope {
  x402Version: 1;
  scheme: 'exact';
  network: string;
  payload: Record<string, unknown>;
}

/** One entry of a 402 response's `accepts` array (x402 standard PaymentRequirements). */
export interface X402Requirement {
  scheme?: string;
  network: string;
  /** Atomic units of `asset` the merchant requires. */
  maxAmountRequired: string;
  payTo: string;
  asset: string;
  resource?: string;
  description?: string;
  mimeType?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
}

export interface PayFetchOptions {
  agentId: string;
  /** Refuse to pay more than this many atomic units. Strongly recommended. */
  maxValue?: string;
  /** Restrict which chains payFetch may pay on (default: any platform chain). */
  chains?: Chain[];
  /** Extra fetch options for both the probe and the paid retry. */
  init?: RequestInit;
  /**
   * Optional fail-closed authorization hook invoked after a payable requirement
   * is selected and validated, but before the KMS signing request is made.
   * Throw or reject to stop the payment.
   */
  beforePayment?: (context: PayFetchAuthorizationContext) => void | Promise<void>;
}

/** Exact public payment context supplied to {@link PayFetchOptions.beforePayment}. */
export interface PayFetchAuthorizationContext {
  url: string;
  agentId: string;
  requirement: X402Requirement;
  chain: Chain;
  tokenSymbol: string;
}

export interface PayFetchResult {
  response: Response;
  /** Present when a payment was actually made (the endpoint returned 402). */
  payment?: {
    signed: SignX402Response;
    envelope: X402Envelope;
    requirement: X402Requirement;
  };
}

/** Networks the platform can sign for, keyed by every alias merchants use. */
const NETWORK_TO_CHAIN: Record<string, Chain> = {
  'avalanche': 'avalanche',
  'avalanche-mainnet': 'avalanche',
  'avax': 'avalanche',
  'eip155:43114': 'avalanche',
  'avalanche-fuji': 'avalanche-fuji',
  'avalanche-testnet': 'avalanche-fuji',
  'fuji': 'avalanche-fuji',
  'eip155:43113': 'avalanche-fuji',
  'base': 'base',
  'base-mainnet': 'base',
  'eip155:8453': 'base',
  'solana': 'solana',
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': 'solana',
  'solana-devnet': 'solana-devnet',
  'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1': 'solana-devnet',
};

/**
 * Token contracts the platform can sign for, per chain (lowercased for EVM).
 * Mirrors the facilitator's `GET /tokens` listing.
 */
const ASSET_TO_SYMBOL: Record<Chain, Record<string, string>> = {
  'avalanche': {
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 'USDC',
    '0xb2f85b7ab3c2b6f62df06de6ae7d09c010a5096e': 'XSGD',
  },
  'avalanche-fuji': {
    '0x5425890298aed601595a70ab815c96711a31bc65': 'USDC',
    '0xd769410dc8772695a7f55a304d2125320a65c2a5': 'XSGD',
  },
  'fuji': {
    '0x5425890298aed601595a70ab815c96711a31bc65': 'USDC',
    '0xd769410dc8772695a7f55a304d2125320a65c2a5': 'XSGD',
  },
  'base': {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
  },
  'solana': {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    '71S9cppWipeUEQDFngYwxjoxB6Sz1MUqX72byLsVYJqy': 'XSGD',
  },
  'solana-devnet': {
    '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU': 'USDC',
    '5qaqr42T127uirLEJbfjpzaETWCyuvJMXapkB1SeduAK': 'XSGD',
  },
};

/** Wrap a platform-signed payment in the standard x402 envelope. */
export function toX402Envelope(signed: SignX402Response): X402Envelope {
  if (isSvmPayload(signed.paymentPayload)) {
    return {
      x402Version: 1,
      scheme: 'exact',
      network: signed.paymentRequirements.network,
      payload: { transaction: signed.paymentPayload.payload.transaction },
    };
  }
  return {
    x402Version: 1,
    scheme: 'exact',
    network: signed.paymentRequirements.network,
    payload: {
      authorization: signed.paymentPayload.payload.authorization,
      signature: signed.paymentPayload.payload.signature,
    },
  };
}

/** Base64 JSON — the value for the `X-PAYMENT` request header. */
export function encodeXPaymentHeader(envelope: X402Envelope): string {
  const json = JSON.stringify(envelope);
  // btoa is browser/edge; Buffer is Node. Support both without deps.
  if (typeof Buffer !== 'undefined') return Buffer.from(json, 'utf-8').toString('base64');
  return btoa(unescape(encodeURIComponent(json)));
}

/** Map a merchant's `network` string to a platform chain, or undefined. */
export function chainForNetwork(network: string): Chain | undefined {
  return NETWORK_TO_CHAIN[network] ?? NETWORK_TO_CHAIN[network.toLowerCase()];
}

/** Map a requirement's asset (token contract/mint) to a platform token symbol. */
export function symbolForAsset(chain: Chain, asset: string): string | undefined {
  const table = ASSET_TO_SYMBOL[chain];
  if (!table) return undefined;
  return table[asset] ?? table[asset.toLowerCase()];
}

/** Extract the `accepts` list from a 402 response body (standard + common variants). */
export function parseAccepts(body: unknown): X402Requirement[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  if (Array.isArray(b.accepts)) return b.accepts as X402Requirement[];
  const single = b.paymentRequirements ?? b.requirements;
  if (single && typeof single === 'object') {
    return Array.isArray(single) ? (single as X402Requirement[]) : [single as X402Requirement];
  }
  return [];
}

/**
 * Choose the first requirement the platform can satisfy: exact scheme,
 * a supported network, and a token the agent's wallet can sign for.
 */
export function selectRequirement(
  accepts: X402Requirement[],
  allowedChains?: Chain[],
): { requirement: X402Requirement; chain: Chain; tokenSymbol: string } | undefined {
  for (const r of accepts) {
    if (r.scheme && r.scheme !== 'exact') continue;
    if (!r.network || !r.payTo || !r.asset || !r.maxAmountRequired) continue;
    const chain = chainForNetwork(r.network);
    if (!chain) continue;
    if (allowedChains && !allowedChains.includes(chain)) continue;
    const tokenSymbol = symbolForAsset(chain, r.asset);
    if (!tokenSymbol) continue;
    return { requirement: r, chain, tokenSymbol };
  }
  return undefined;
}
