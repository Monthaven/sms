/**
 * PROPRIETARY — Always Improving LLC
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { env } from '../env';
import { logger } from '../logger';

interface DealMachinePhone {
  number: string;
  type?: string;
  label?: string;
}

export interface DealMachineContact {
  id: string;
  firstName?: string;
  lastName?: string;
  ownerName?: string;
  fullName?: string;
  updatedAt?: string;
  property?: {
    address1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    parcelId?: string;
  };
  phones?: DealMachinePhone[];
  phoneNumbers?: DealMachinePhone[];
  emails?: string[];
  email?: string;
  raw?: Record<string, any>;
}

interface PageResult {
  contacts: DealMachineContact[];
  nextCursor?: string;
}

interface ListParams {
  cursor?: string;
  since?: string;
  pageSize?: number;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 4,
  initialDelayMs: 750,
  backoffMultiplier: 2,
};

const authHeader = env.DEALMACHINE_API_KEY
  ? { Authorization: `Bearer ${env.DEALMACHINE_API_KEY}` }
  : {};

export class DealMachineClient {
  private baseUrl = env.DEALMACHINE_API_BASE || 'https://api.dealmachine.com';
  private log = logger.child({ service: 'DealMachineClient' });

  private async withRetry<T>(operation: () => Promise<T>, name: string): Promise<T> {
    let delay = DEFAULT_RETRY.initialDelayMs;
    let lastError: any = null;
    for (let attempt = 1; attempt <= DEFAULT_RETRY.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err: any) {
        lastError = err;
        const status = err?.status ?? err?.response?.status;
        // Do not retry 4xx except 429
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw err;
        }
        if (attempt < DEFAULT_RETRY.maxRetries) {
          this.log.warn(`${name} failed; retrying`, { attempt, delayMs: delay, status });
          await new Promise((res) => setTimeout(res, delay));
          delay *= DEFAULT_RETRY.backoffMultiplier;
        }
      }
    }
    throw lastError;
  }

  private async request(path: string, params: Record<string, string | number | undefined> = {}): Promise<any> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) search.append(key, String(value));
    });
    const url = `${this.baseUrl}${path}${search.toString() ? `?${search.toString()}` : ''}`;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      const error: any = new Error(`DealMachine API error ${res.status}: ${text}`);
      (error as any).status = res.status;
      throw error;
    }
    return res.json();
  }

  private async page(params: ListParams): Promise<PageResult> {
    const pageSize = params.pageSize ?? env.DEALMACHINE_PAGE_SIZE ?? 100;
    // NOTE: API parameters may differ; adjust query names to match actual DealMachine API.
    const body = await this.withRetry(
      () =>
        this.request('/contacts', {
          limit: pageSize,
          cursor: params.cursor,
          updated_after: params.since,
        }),
      'listContacts'
    );

    const contacts: DealMachineContact[] = Array.isArray(body.contacts)
      ? body.contacts
      : Array.isArray(body.data)
      ? body.data
      : [];

    const nextCursor = body.nextCursor || body.next_cursor || body.cursor;
    return { contacts, nextCursor };
  }

  async *iterateContacts(params: { since?: string; limit?: number }) {
    if (!env.DEALMACHINE_API_KEY) {
      throw new Error('DEALMACHINE_API_KEY is required to pull from DealMachine');
    }

    let cursor: string | undefined = undefined;
    let yielded = 0;
    const limit = params.limit ?? Infinity;

    while (yielded < limit) {
      const { contacts, nextCursor } = await this.page({ cursor, since: params.since });
      if (!contacts.length) break;

      for (const contact of contacts) {
        if (yielded >= limit) break;
        yielded += 1;
        yield contact;
      }

      if (!nextCursor) break;
      cursor = nextCursor;
    }
    this.log.info('DealMachine pull complete', { yielded });
  }
}
