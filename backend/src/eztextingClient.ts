import { env } from './env';

interface EzTextingContact {
  phone: string;
  firstName?: string;
  lastName?: string;
}

export class EzTextingClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = env.EZTEXTING_API_KEY;
    this.baseUrl = env.EZTEXTING_API_BASE.replace(/\/$/, '');
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`
    };
  }

  async createContactList(name: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/lists`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EzTexting create list failed: ${res.status} ${text}`);
    }
    const data: any = await res.json();
    return String(data.id ?? data.listId);
  }

  async addContactsToList(listId: string, contacts: EzTextingContact[]): Promise<void> {
    if (!contacts.length) return;
    const res = await fetch(`${this.baseUrl}/lists/${encodeURIComponent(listId)}/contacts`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ contacts })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EzTexting add contacts failed: ${res.status} ${text}`);
    }
  }

  async sendCampaign(listId: string, message: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/campaigns`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ listId, message })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`EzTexting send campaign failed: ${res.status} ${text}`);
    }
    const data: any = await res.json();
    return String(data.id ?? data.campaignId);
  }
}

export const ezTextingClient = new EzTextingClient();
