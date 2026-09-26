/**
 * x402 resource — wraps the canonical sign Lambda and adds the convenience
 * `pay()` helper that signs + settles in one call.
 *
 *   POST /v1/agent/x402/sign  (Lambda — policy-enforced)
 *   POST /settle              (facilitator — submits on-chain)
 *
 * Common usage:
 *
 *     await client.x402.pay({ agentId: 'bot-1', to: '0x…', value: '500000' });
 *     // → returns { signed, settle: { transaction, blockNumber, … } }
 *
 * Or hand-roll the two steps for advanced flows:
 *
 *     const signed = await client.x402.sign({ … });
 *     const r = await client.facilitator.settle(signed.paymentPayload, signed.paymentRequirements);
 */
import type { Http } from './http.js';
import type { FacilitatorApi } from './facilitator.js';
import type {
  PayInput,
  PayResult,
  SignX402Input,
  SignX402Response,
} from './types.js';
import {
  encodeXPaymentHeader,
  parseAccepts,
  selectRequirement,
  toX402Envelope,
  type PayFetchOptions,
  type PayFetchResult,
} from './x402-http.js';

export class X402Api {
  constructor(
    private readonly http: Http,
    private readonly facilitator: FacilitatorApi,
    private readonly fetchFn: typeof globalThis.fetch = globalThis.fetch,
  ) {}

  /** Sign a TransferWithAuthorization. Policy checks happen here — caps, allowed tokens/chains, daily spend. */
  sign(input: SignX402Input): Promise<SignX402Response> {
    return this.http.post('/v1/agent/x402/sign', input);
  }

  /**
   * Sign and (by default) immediately settle on-chain via the facilitator.
   * Pass `settle: false` to get the signed payload only — useful if you
   * want to forward it to a different facilitator or queue it.
   */
  async pay(input: PayInput): Promise<PayResult> {
    const { settle = true, ...signInput } = input;
    const signed = await this.sign(signInput);
    if (!settle) return { agentId: signed.agentId, signed };
    const settleResult = await this.facilitator.settle(signed.paymentPayload, signed.paymentRequirements);
    return { agentId: signed.agentId, signed, settle: settleResult };
  }

  /**
   * Fetch any URL, automatically paying if the server responds 402.
   *
   * The standard x402 client flow: probe → parse `accepts` → pick a
   * requirement the platform can satisfy (supported chain + known token) →
   * policy-checked KMS sign → retry with the base64 `X-PAYMENT` header.
   * The merchant's side settles (x402 model); policy caps still gate the
   * signature exactly like `pay()`.
   *
   *     const { response, payment } = await client.x402.payFetch(
   *       'https://api.example.com/data',
   *       { agentId: 'bot-1', maxValue: '1000000' },   // refuse to pay > 1 USDC
   *     );
   */
  async payFetch(url: string, opts: PayFetchOptions): Promise<PayFetchResult> {
    if (!opts?.agentId) throw new Error('payFetch: opts.agentId is required');
    const probe = await this.fetchFn(url, opts.init);
    if (probe.status !== 402) return { response: probe };

    let body: unknown;
    try {
      body = await probe.clone().json();
    } catch {
      throw new Error(`payFetch: ${url} returned 402 but the body is not JSON payment requirements`);
    }
    const accepts = parseAccepts(body);
    if (accepts.length === 0) {
      throw new Error(`payFetch: ${url} returned 402 without a parseable accepts/paymentRequirements list`);
    }

    const match = selectRequirement(accepts, opts.chains);
    if (!match) {
      const offered = accepts.map((a) => `${a.network}:${a.asset}`).join(', ');
      throw new Error(
        `payFetch: no payable requirement — merchant accepts [${offered}], ` +
        `but none match a platform-supported chain + token`,
      );
    }
    const { requirement, chain, tokenSymbol } = match;

    if (opts.maxValue !== undefined && BigInt(requirement.maxAmountRequired) > BigInt(opts.maxValue)) {
      throw new Error(
        `payFetch: merchant requires ${requirement.maxAmountRequired} atomic units ` +
        `which exceeds maxValue=${opts.maxValue}`,
      );
    }

    await opts.beforePayment?.({
      url,
      agentId: opts.agentId,
      requirement,
      chain,
      tokenSymbol,
    });

    const validBefore = Math.floor(Date.now() / 1000) +
      Math.min(requirement.maxTimeoutSeconds ?? 300, 3600);
    const signed = await this.sign({
      agentId: opts.agentId,
      to: requirement.payTo,
      value: requirement.maxAmountRequired,
      tokenSymbol,
      chain,
      validBefore,
    });

    const envelope = toX402Envelope(signed);
    const headers = new Headers(opts.init?.headers);
    headers.set('X-PAYMENT', encodeXPaymentHeader(envelope));
    const response = await this.fetchFn(url, { ...opts.init, headers });
    return { response, payment: { signed, envelope, requirement } };
  }
}
