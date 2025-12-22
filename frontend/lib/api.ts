/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

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
    interactions?: Array<{
      id: string;
      body: string | null;
      createdAt: string;
      direction: string;
    }>;
  };
  property: {
    addressLine1: string;
    city: string;
    state: string;
  } | null;
  updatedAt: string;
  assignedAgentId?: string | null;
}

export const fetchLeads = async (statuses?: string | string[]) => {
  let statusParam: string | undefined;
  if (Array.isArray(statuses)) {
    statusParam = statuses.join(",");
  } else {
    statusParam = statuses;
  }
  const params = statusParam ? { status: statusParam } : {};
  try {
    const { data } = await api.get<Lead[]>("/leads", { params });
    return data;
  } catch (err) {
    console.warn("fetchLeads failed:", err);
    return [] as Lead[];
  }
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
  try {
    const { data } = await api.get<CampaignSummary[]>("/campaigns");
    return data;
  } catch (err) {
    console.warn("fetchCampaigns failed:", err);
    return [] as CampaignSummary[];
  }
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
  try {
    const { data } = await api.get<AutomationRow[]>("/automations");
    return data;
  } catch (err) {
    console.warn("fetchAutomations failed:", err);
    return [] as AutomationRow[];
  }
};

export interface IntegrationStatus {
  id: string;
  name: string;
  status: "connected" | "pending" | "disconnected";
  lastEvent: string;
  meta?: Record<string, unknown>;
}

export const fetchIntegrations = async (): Promise<IntegrationStatus[]> => {
  try {
    const { data } = await api.get<IntegrationStatus[]>("/integrations");
    return data;
  } catch (err) {
    console.warn("fetchIntegrations failed:", err);
    return [] as IntegrationStatus[];
  }
};
