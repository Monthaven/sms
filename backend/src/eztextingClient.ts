import { env } from './env';

interface EzTextingContact {
  phoneNumber: string; // Changed from 'phone' to match API
  firstName?: string;
  lastName?: string;
}

export class EzTextingClient {
  private baseUrl: string;
  private authHeader: Record<string, string>;

  constructor() {
    // The NEW API URL from your docs
    this.baseUrl = 'https://a.eztexting.com/v1'; 
    
    // We will use Basic Auth (User/Pass) as it is simpler/stable for server-side apps
    if (process.env.EZTEXTING_USER && process.env.EZTEXTING_PASS) {
      const creds = Buffer.from(`${process.env.EZTEXTING_USER}:${process.env.EZTEXTING_PASS}`).toString('base64');
      this.authHeader = { Authorization: `Basic ${creds}` };
    } else if (process.env.EZTEXTING_API_KEY) {
      // Fallback if you generated a long-lived token (if they exist)
      this.authHeader = { Authorization: `Bearer ${process.env.EZTEXTING_API_KEY}` };
    } else {
      console.warn('EzTexting credentials missing in .env');
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
      throw new Error(`EzTexting API Error (${res.status}): ${text}`);
    }
    return res.json();
  }

  // Docs: POST https://a.eztexting.com/v1/contact-groups
  async createContactList(name: string): Promise<string> {
    const data: any = await this.request('/contact-groups', 'POST', { name });
    // API returns the full group object, we need the ID
    return String(data.id); 
  }

  // Docs: POST https://a.eztexting.com/v1/contacts (Batched)
  async addContactsToList(groupId: string, contacts: EzTextingContact[]): Promise<void> {
    // The new API allows bulk create. We must attach them to the groupID.
    // We process in chunks of 100 to be safe (Rate limits are 200 req/min).
    const chunkSize = 50;
    
    for (let i = 0; i < contacts.length; i += chunkSize) {
      const chunk = contacts.slice(i, i + chunkSize).map(c => ({
        phoneNumber: c.phoneNumber,
        firstName: c.firstName,
        lastName: c.lastName,
        groups: [groupId] // Direct assignment to group
      }));

      await this.request('/contacts', 'POST', chunk);
    }
  }

  // Docs: POST https://a.eztexting.com/v1/messages
  async sendCampaign(groupId: string, message: string): Promise<string> {
    const data: any = await this.request('/messages', 'POST', {
      groupIds: [groupId], // New API uses 'groupIds' array
      message: message,
      // mediaUrl: "..." // Optional: Add later if needed
    });
    return String(data.id);
  }
}

export const ezTextingClient = new EzTextingClient();
