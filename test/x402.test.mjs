/**
 * Tests for the x402 payment flows — runs against the built dist/ (node --test).
 *
 * Uses an injected mock fetch (ClientConfig.fetch) so no network is touched.
 * Covers:
 *   1. payFetch: full 402 → sign → X-PAYMENT retry flow
 *   2. envelope + header wire format (standard x402)
 *   3. requirement selection (network/asset mapping, unpayable cases)
 *   4. maxValue guard
 *   5. REGRESSION: pay()/sign() request+response shapes unchanged
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  OxGasAgent,
  toX402Envelope,
  encodeXPaymentHeader,
  parseAccepts,
  selectRequirement,
  chainForNetwork,
  symbolForAsset,
} from '../dist/index.js';

const SIGNED_EVM = {
  payerAddress: '0xPayer',
  agentId: 'bot-1',
  tokenSymbol: 'USDC',
  chain: 'avalanche-fuji',
  paymentPayload: {
    token: '0x5425890298aed601595a70AB815c96711a31Bc65',
    payload: {
      authorization: {
        from: '0xPayer', to: '0xMerchant', value: '500000',
        validAfter: 0, validBefore: 1999999999, nonce: '0xabc',
      },
      signature: '0xsig',
    },
  },
  paymentRequirements: { network: 'avalanche-fuji', chainId: 43113 },
  policy: { perTxCapUSD: 5, perDayCapUSD: 50, spentTodayUSD: 0, remainingTodayUSD: 50 },
};

function makeClient(routes) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    for (const [match, handler] of routes) {
      if (String(url).includes(match)) return handler(String(url), init);
    }
    throw new Error(`unmocked fetch: ${url}`);
  };
  const client = new OxGasAgent({ apiKey: 'test-key', fetch: fetchFn });
  return { client, calls };
}

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// ─── wire-format helpers ───────────────────────────────────────────

test('toX402Envelope wraps EVM payload in the standard envelope', () => {
  const env = toX402Envelope(SIGNED_EVM);
  assert.equal(env.x402Version, 1);
  assert.equal(env.scheme, 'exact');
  assert.equal(env.network, 'avalanche-fuji');
  assert.deepEqual(env.payload.authorization, SIGNED_EVM.paymentPayload.payload.authorization);
  assert.equal(env.payload.signature, '0xsig');
});

test('toX402Envelope wraps SVM payload with the transaction', () => {
  const svm = {
    ...SIGNED_EVM,
    paymentPayload: { token: 'EPjF', payload: { transaction: 'base64tx==' } },
    paymentRequirements: { network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', asset: 'EPjF', payTo: 'X', feePayer: 'F' },
  };
  const env = toX402Envelope(svm);
  assert.equal(env.payload.transaction, 'base64tx==');
  assert.equal(env.network, 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
});

test('encodeXPaymentHeader is base64 JSON that round-trips', () => {
  const env = toX402Envelope(SIGNED_EVM);
  const header = encodeXPaymentHeader(env);
  const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  assert.deepEqual(decoded, env);
});

// ─── requirement parsing + selection ───────────────────────────────

test('parseAccepts handles standard accepts[] and single-object variants', () => {
  const req = { network: 'base', asset: '0x1', payTo: '0x2', maxAmountRequired: '1' };
  assert.equal(parseAccepts({ accepts: [req] }).length, 1);
  assert.equal(parseAccepts({ paymentRequirements: req }).length, 1);
  assert.equal(parseAccepts({ requirements: req }).length, 1);
  assert.equal(parseAccepts({}).length, 0);
  assert.equal(parseAccepts(null).length, 0);
});

test('selectRequirement picks a platform-payable option and maps aliases', () => {
  const accepts = [
    { scheme: 'upto', network: 'base', asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', payTo: '0xA', maxAmountRequired: '1' },   // wrong scheme
    { network: 'eip155:999', asset: '0xdead', payTo: '0xA', maxAmountRequired: '1' },                                                  // unknown chain
    { network: 'fuji', asset: '0x5425890298AED601595a70AB815c96711a31Bc65', payTo: '0xA', maxAmountRequired: '9' },                    // payable (case-insensitive asset)
  ];
  const m = selectRequirement(accepts);
  assert.ok(m);
  assert.equal(m.chain, 'avalanche-fuji');
  assert.equal(m.tokenSymbol, 'USDC');
  assert.equal(m.requirement.maxAmountRequired, '9');
});

test('chain/asset maps cover the live facilitator listing', () => {
  assert.equal(chainForNetwork('eip155:43114'), 'avalanche');
  assert.equal(chainForNetwork('base-mainnet'), 'base');
  assert.equal(symbolForAsset('avalanche', '0xB2F85b7AB3c2b6f62DF06dE6aE7D09c010a5096E'), 'XSGD');
  assert.equal(symbolForAsset('solana', 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), 'USDC');
});

// ─── payFetch flow ─────────────────────────────────────────────────

const MERCHANT_402 = {
  x402Version: 1,
  accepts: [{
    scheme: 'exact',
    network: 'avalanche-fuji',
    maxAmountRequired: '500000',
    payTo: '0xMerchant',
    asset: '0x5425890298aed601595a70AB815c96711a31Bc65',
    maxTimeoutSeconds: 120,
  }],
};

test('payFetch: 402 → sign → retry with X-PAYMENT → resource', async () => {
  let merchantHits = 0;
  const { client, calls } = makeClient([
    ['/v1/agent/x402/sign', () => json(200, SIGNED_EVM)],
    ['merchant.example', (url, init) => {
      merchantHits++;
      const headers = new Headers(init.headers);
      if (!headers.get('X-PAYMENT')) return json(402, MERCHANT_402);
      return json(200, { data: 'paid content' });
    }],
  ]);

  const { response, payment } = await client.x402.payFetch('https://merchant.example/data', { agentId: 'bot-1' });

  assert.equal(merchantHits, 2);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: 'paid content' });
  assert.ok(payment);
  assert.equal(payment.envelope.scheme, 'exact');

  // the sign call carried the merchant's requirement, mapped to platform inputs
  const signCall = calls.find((c) => c.url.includes('/v1/agent/x402/sign'));
  const body = JSON.parse(signCall.init.body);
  assert.equal(body.to, '0xMerchant');
  assert.equal(body.value, '500000');
  assert.equal(body.tokenSymbol, 'USDC');
  assert.equal(body.chain, 'avalanche-fuji');
  assert.ok(body.validBefore <= Math.floor(Date.now() / 1000) + 120);

  // the retry carried a decodable standard envelope
  const paid = calls.filter((c) => c.url.includes('merchant.example'))[1];
  const header = new Headers(paid.init.headers).get('X-PAYMENT');
  const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf-8'));
  assert.equal(decoded.x402Version, 1);
  assert.equal(decoded.payload.signature, '0xsig');
});

test('payFetch: non-402 responses pass through without payment', async () => {
  const { client } = makeClient([['merchant.example', () => json(200, { free: true })]]);
  const { response, payment } = await client.x402.payFetch('https://merchant.example/free', { agentId: 'bot-1' });
  assert.equal(response.status, 200);
  assert.equal(payment, undefined);
});

test('payFetch: maxValue guard refuses over-priced requirements', async () => {
  const { client } = makeClient([['merchant.example', () => json(402, MERCHANT_402)]]);
  await assert.rejects(
    () => client.x402.payFetch('https://merchant.example/data', { agentId: 'bot-1', maxValue: '100' }),
    /exceeds maxValue/,
  );
});

test('payFetch: beforePayment receives the selected requirement before signing', async () => {
  const seen = [];
  const { client, calls } = makeClient([
    ['/v1/agent/x402/sign', () => json(200, SIGNED_EVM)],
    ['merchant.example', (url, init) => {
      const headers = new Headers(init.headers);
      return headers.get('X-PAYMENT')
        ? json(200, { data: 'paid content' })
        : json(402, MERCHANT_402);
    }],
  ]);

  const { response } = await client.x402.payFetch('https://merchant.example/data', {
    agentId: 'bot-1',
    beforePayment: async (context) => { seen.push(context); },
  });

  assert.equal(response.status, 200);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, 'https://merchant.example/data');
  assert.equal(seen[0].agentId, 'bot-1');
  assert.equal(seen[0].chain, 'avalanche-fuji');
  assert.equal(seen[0].tokenSymbol, 'USDC');
  assert.deepEqual(seen[0].requirement, MERCHANT_402.accepts[0]);
  assert.ok(calls.find((c) => c.url.includes('/v1/agent/x402/sign')));
});

test('payFetch: beforePayment rejection fails closed before signing or retry', async () => {
  let merchantHits = 0;
  const { client, calls } = makeClient([
    ['merchant.example', () => {
      merchantHits++;
      return json(402, MERCHANT_402);
    }],
  ]);

  await assert.rejects(
    () => client.x402.payFetch('https://merchant.example/data', {
      agentId: 'bot-1',
      beforePayment: async () => { throw new Error('owner policy denied payment'); },
    }),
    /owner policy denied payment/,
  );

  assert.equal(merchantHits, 1);
  assert.equal(calls.some((c) => c.url.includes('/v1/agent/x402/sign')), false);
});

test('payFetch: unpayable requirements produce a clear error', async () => {
  const unpayable = { accepts: [{ network: 'eip155:1', asset: '0xdead', payTo: '0xA', maxAmountRequired: '1' }] };
  const { client } = makeClient([['merchant.example', () => json(402, unpayable)]]);
  await assert.rejects(
    () => client.x402.payFetch('https://merchant.example/data', { agentId: 'bot-1' }),
    /no payable requirement/,
  );
});

// ─── REGRESSION: existing behavior unchanged ───────────────────────

test('regression: sign() posts input verbatim and returns the platform shape', async () => {
  const { client, calls } = makeClient([['/v1/agent/x402/sign', () => json(200, SIGNED_EVM)]]);
  const input = { agentId: 'bot-1', to: '0xMerchant', value: '500000' };
  const signed = await client.x402.sign(input);
  assert.deepEqual(JSON.parse(calls[0].init.body), input);          // request unchanged
  assert.deepEqual(signed, SIGNED_EVM);                              // response passthrough
});

test('regression: pay() settles via the 0xgasless facilitator with the exact signed shapes', async () => {
  const settleResult = { success: true, transaction: '0xhash', network: 'avalanche-fuji' };
  let settleBody;
  const { client } = makeClient([
    ['/v1/agent/x402/sign', () => json(200, SIGNED_EVM)],
    ['/settle', (url, init) => { settleBody = JSON.parse(init.body); return json(200, settleResult); }],
  ]);
  const result = await client.x402.pay({ agentId: 'bot-1', to: '0xMerchant', value: '500000' });
  // facilitator receives the platform-variant payload UNWRAPPED (no envelope) — byte-identical behavior
  assert.deepEqual(settleBody.paymentPayload, SIGNED_EVM.paymentPayload);
  assert.deepEqual(settleBody.paymentRequirements, SIGNED_EVM.paymentRequirements);
  assert.deepEqual(result.settle, settleResult);
});

test('regression: pay({settle:false}) returns signed payload only', async () => {
  const { client } = makeClient([['/v1/agent/x402/sign', () => json(200, SIGNED_EVM)]]);
  const result = await client.x402.pay({ agentId: 'bot-1', to: '0xM', value: '1', settle: false });
  assert.equal(result.settle, undefined);
  assert.deepEqual(result.signed, SIGNED_EVM);
});
