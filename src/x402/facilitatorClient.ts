import { FacilitatorConfig } from './types';
import { PaymentPayload, PaymentRequirements, VerifyResponse, SettleResponse } from '../types';

export class FacilitatorClient {
  private readonly cfg: FacilitatorConfig;

  constructor(cfg: FacilitatorConfig) {
    if (!cfg.url.startsWith('http://') && !cfg.url.startsWith('https://')) {
      throw new Error(`Invalid facilitator URL: ${cfg.url}`);
    }
    this.cfg = { ...cfg, url: cfg.url.endsWith('/') ? cfg.url.slice(0, -1) : cfg.url };
  }

  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<VerifyResponse> {
    try {
      const normalized = {
        ...payload,
        payload: {
          authorization: {
            ...payload.payload.authorization,
            value: payload.payload.authorization.value.toString(),
            validAfter: payload.payload.authorization.validAfter.toString(),
            validBefore: payload.payload.authorization.validBefore.toString()
          },
          signature: payload.payload.signature
        }
      };

      const res = await fetch(`${this.cfg.url}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.cfg.apiKey && { 'Authorization': `Bearer ${this.cfg.apiKey}` })
        },
        body: JSON.stringify({ paymentPayload: normalized, paymentRequirements: requirements })
      });

      if (!res.ok) {
        return { isValid: false, invalidReason: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json() as any;
      return { isValid: !!(data.isValid || data.is_valid), payer: data.payer, invalidReason: data.invalidReason || data.invalid_reason };
    } catch (e: any) {
      return { isValid: false, invalidReason: `Network error: ${e?.message || String(e)}` };
    }
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<SettleResponse> {
    try {
      const normalized = {
        ...payload,
        payload: {
          authorization: {
            ...payload.payload.authorization,
            value: payload.payload.authorization.value.toString(),
            validAfter: payload.payload.authorization.validAfter.toString(),
            validBefore: payload.payload.authorization.validBefore.toString()
          },
          signature: payload.payload.signature
        }
      };

      const res = await fetch(`${this.cfg.url}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.cfg.apiKey && { 'Authorization': `Bearer ${this.cfg.apiKey}` })
        },
        body: JSON.stringify({ paymentPayload: normalized, paymentRequirements: requirements })
      });

      if (!res.ok) {
        return { success: false, network: requirements.network, errorReason: `HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json() as any;
      return {
        success: !!data.success,
        transaction: data.transaction || data.transactionHash,
        network: data.network || requirements.network,
        payer: data.payer,
        errorReason: data.errorReason || data.error_reason
      };
    } catch (e: any) {
      return { success: false, network: requirements.network, errorReason: `Network error: ${e?.message || String(e)}` };
    }
  }
}


