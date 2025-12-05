import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Proxied by Next.js
  headers: {
    "Content-Type": "application/json",
  },
});
export interface Lead {
  id: string;
  status: string;
  sentimentScore?: number | null;
  contact: {
    firstName: string | null;
    lastName: string | null;
    phoneE164: string;
  };
  property: {
    addressLine1: string;
    city: string;
    state: string;
  } | null;
  updatedAt: string;
  assignedAgentId?: string | null;
  interactions?: Array<{
    id: string;
    body: string | null;
    createdAt: string;
    direction: string;
  }>;
}

export const fetchLeads = async (statuses?: string | string[]) => {
  let statusParam: string | undefined;
  if (Array.isArray(statuses)) {
    statusParam = statuses.join(",");
  } else {
    statusParam = statuses;
  }
  const params = statusParam ? { status: statusParam } : {};
  const { data } = await api.get<Lead[]>("/leads", { params });
  return data;
};

export const loginUser = async (email: string) => {
  const { data } = await api.post("/auth/login", { email });
  return data;
};

export default api;

export interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  channel: string;
  messages: number;
  owner: string;
  eta: string;
  lastActivity: string;
}

export const fetchCampaigns = async (): Promise<CampaignSummary[]> => {
  const { data } = await api.get<CampaignSummary[]>("/campaigns");
  return data;
};

export interface AutomationRow {
  id: string;
  name: string;
  cadence: string;
  owner: string;
  status: "healthy" | "warning" | "paused";
  lastRun: string;
}

export const fetchAutomations = async (): Promise<AutomationRow[]> => {
  const { data } = await api.get<AutomationRow[]>("/automations");
  return data;
};

export interface IntegrationStatus {
  id: string;
  name: string;
  status: "connected" | "pending" | "disconnected";
  lastEvent: string;
  meta?: Record<string, unknown>;
}

export const fetchIntegrations = async (): Promise<IntegrationStatus[]> => {
  const { data } = await api.get<IntegrationStatus[]>("/integrations");
  return data;
};
