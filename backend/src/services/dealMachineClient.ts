/**
 * PROPRIETARY — Always Improving LLC
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { env } from '../env';
import { logger } from '../logger';
import type { DealMachineLead } from './dealMachineTypes';

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

const authHeader: Record<string, string> = env.DEALMACHINE_API_KEY
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

  /**
   * Fetch a single page of leads from DealMachine API
   * @param after Cursor for pagination
   * @param limit Number of leads to fetch per page (default: 100)
   * @returns Page of leads with next cursor
   */
  private async pageLeads(after?: string, limit?: number): Promise<{ leads: DealMachineLead[]; nextCursor?: string }> {
    const pageSize = limit ?? env.DEALMACHINE_PAGE_SIZE ?? 100;

    const body = await this.withRetry(
      () =>
        this.request('/public/v1/leads', {
          limit: pageSize,
          after: after,
        }),
      'listLeads'
    );

    // Handle various response formats
    const leads: DealMachineLead[] = Array.isArray(body.leads)
      ? body.leads
      : Array.isArray(body.data)
      ? body.data
      : [];

    const nextCursor = body.after || body.nextCursor || body.next_cursor || body.cursor;
    return { leads, nextCursor };
  }

  /**
   * Iterate through all leads from DealMachine API
   * Yields leads one at a time with automatic pagination
   * Implements rate limiting: 300-500ms pause between pages
   *
   * @param params.since Only fetch leads updated after this ISO date
   * @param params.limit Maximum number of leads to fetch (for testing)
   * @yields DealMachineLead objects one at a time
   *
   * @example
   * const client = new DealMachineClient();
   * for await (const lead of client.iterateLeads({ limit: 100 })) {
   *   console.log(lead.property_address_line1);
   * }
   */
  async *iterateLeads(params: { since?: string; limit?: number } = {}): AsyncGenerator<DealMachineLead> {
    if (!env.DEALMACHINE_API_KEY) {
      throw new Error('DEALMACHINE_API_KEY is required to pull from DealMachine');
    }

    let cursor: string | undefined = undefined;
    let yielded = 0;
    const limit = params.limit ?? Infinity;

    while (yielded < limit) {
      // Fetch page of leads
      const { leads, nextCursor } = await this.pageLeads(cursor);

      if (!leads.length) break;

      // Yield each lead
      for (const lead of leads) {
        if (yielded >= limit) break;
        yielded += 1;
        yield lead;
      }

      if (!nextCursor) break;
      cursor = nextCursor;

      // Rate limiting: pause 300-500ms between pages (10 req/sec = 100ms min, but we're conservative)
      const pauseMs = 300 + Math.random() * 200; // 300-500ms
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }

    this.log.info('DealMachine leads pull complete', { yielded });
  }

  /**
   * Fetch all leads from DealMachine API and return as array
   * Useful for smaller datasets or when you need all leads at once
   *
   * @param limit Optional limit on number of leads to fetch
   * @returns Array of all leads
   *
   * @example
   * const client = new DealMachineClient();
   * const leads = await client.fetchAllLeads(100);
   * console.log(`Fetched ${leads.length} leads`);
   */
  async fetchAllLeads(limit?: number): Promise<DealMachineLead[]> {
    const leads: DealMachineLead[] = [];
    for await (const lead of this.iterateLeads({ limit })) {
      leads.push(lead);
    }
    return leads;
  }
}
