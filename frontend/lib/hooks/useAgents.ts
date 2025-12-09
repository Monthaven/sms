"use client";

import { useQuery } from "@tanstack/react-query";

export type AgentPresence = {
  id: string;
  name: string;
  email: string;
  role: string;
  leadsAssigned: number;
  status: "online" | "away" | "offline";
};

async function fetchAgents(): Promise<AgentPresence[]> {
  try {
    const res = await fetch("/api/agents");
    if (!res.ok) {
      console.warn("fetchAgents non-ok response:", res.status);
      return [];
    }
    return (await res.json()) as AgentPresence[];
  } catch (err) {
    console.warn("fetchAgents failed:", err);
    return [];
  }
}

export function useAgents() {
  return useQuery<AgentPresence[]>({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    refetchInterval: 15000,
  });
}
