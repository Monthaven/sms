/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { env } from './env';
import { logger } from './logger';

interface EzTextingContact {
  phoneNumber: string; // Changed from 'phone' to match API
  firstName?: string;
  lastName?: string;
}

interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

// Retry helper with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except 429 (rate limit)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        logger.error(`${operationName} failed with client error`, { status: error.status, attempt });
        throw error;
      }

      if (attempt < config.maxRetries) {
        logger.warn(`${operationName} failed, retrying`, { 
          attempt, 
          maxRetries: config.maxRetries, 
          delayMs: delay,
          error: error.message 
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= config.backoffMultiplier;
      }
    }
  }

  logger.error(`${operationName} failed after all retries`, { 
    maxRetries: config.maxRetries,
    error: lastError?.message 
  });
  throw lastError;
}

class APIError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

export class EzTextingClient {
  private baseUrl: string;
  private authHeader: Record<string, string>;
  private log = logger.child({ service: 'EzTextingClient' });

  constructor() {
    // The NEW API URL from your docs
    this.baseUrl = 'https://a.eztexting.com/v1'; 
    
    // We will use Basic Auth (User/Pass) as it is simpler/stable for server-side apps
    if (process.env.EZTEXTING_USER && process.env.EZTEXTING_PASS) {
      const creds = Buffer.from(`${process.env.EZTEXTING_USER}:${process.env.EZTEXTING_PASS}`).toString('base64');
      this.authHeader = { Authorization: `Basic ${creds}` };
      this.log.info('EzTexting client initialized with Basic auth');
    } else if (process.env.EZTEXTING_API_KEY) {
      // Fallback if you generated a long-lived token (if they exist)
      this.authHeader = { Authorization: `Bearer ${process.env.EZTEXTING_API_KEY}` };
      this.log.info('EzTexting client initialized with Bearer token');
    } else {
      this.log.warn('EzTexting credentials missing in .env');
      this.authHeader = {};
    }
  }

  private async request(endpoint: string, method: 'GET' | 'POST', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.authHeader
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const text = await res.text();
      throw new APIError(`EzTexting API Error (${res.status}): ${text}`, res.status);
    }
    return res.json();
  }

  // Docs: POST https://a.eztexting.com/v1/contact-groups
  async createContactList(name: string): Promise<string> {
    this.log.info('Creating contact list', { name });
    
    const data: any = await withRetry(
      () => this.request('/contact-groups', 'POST', { name }),
      DEFAULT_RETRY_CONFIG,
      'createContactList'
    );
    
    const groupId = String(data.id);
    this.log.info('Contact list created', { name, groupId });
    return groupId;
  }

  // Docs: POST https://a.eztexting.com/v1/contacts (Batched)
  async addContactsToList(groupId: string, contacts: EzTextingContact[]): Promise<void> {
    this.log.info('Adding contacts to list', { groupId, contactCount: contacts.length });
    
    // The new API allows bulk create. We must attach them to the groupID.
    // We process in chunks of 50 to be safe (Rate limits are 200 req/min).
    const chunkSize = 50;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < contacts.length; i += chunkSize) {
      const chunk = contacts.slice(i, i + chunkSize).map(c => ({
        phoneNumber: c.phoneNumber,
        firstName: c.firstName,
        lastName: c.lastName,
        groups: [groupId] // Direct assignment to group
      }));

      try {
        await withRetry(
          () => this.request('/contacts', 'POST', chunk),
          DEFAULT_RETRY_CONFIG,
          `addContacts_chunk_${i / chunkSize + 1}`
        );
        successCount += chunk.length;
        
        // Rate limit: add delay between chunks to stay under 200 req/min
        if (i + chunkSize < contacts.length) {
          await new Promise(resolve => setTimeout(resolve, 350)); // ~170 req/min
        }
      } catch (error: any) {
        errorCount += chunk.length;
        this.log.error('Failed to add contacts chunk', { 
          chunkStart: i, 
          chunkSize: chunk.length,
          error: error.message 
        });
        // Continue with next chunk instead of failing entire operation
      }
    }

    this.log.info('Contacts added to list', { groupId, successCount, errorCount });
  }

  // Docs: POST https://a.eztexting.com/v1/messages
  async sendCampaign(groupId: string, message: string): Promise<string> {
    this.log.info('Sending campaign', { groupId, messageLength: message.length });
    
    const data: any = await withRetry(
      () => this.request('/messages', 'POST', {
        groupIds: [groupId], // New API uses 'groupIds' array
        message: message,
        // mediaUrl: "..." // Optional: Add later if needed
      }),
      DEFAULT_RETRY_CONFIG,
      'sendCampaign'
    );
    
    const campaignId = String(data.id);
    this.log.info('Campaign sent', { groupId, campaignId });
    return campaignId;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/contact-groups?limit=1', 'GET');
      return true;
    } catch (error) {
      this.log.error('EzTexting health check failed', { error });
      return false;
    }
  }
}

export const ezTextingClient = new EzTextingClient();
