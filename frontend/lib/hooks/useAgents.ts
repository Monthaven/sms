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
  const res = await fetch("/api/agents");
  if (!res.ok) {
    throw new Error("Unable to load agents");
  }
  return res.json();
}

export function useAgents() {
  return useQuery<AgentPresence[]>({
    queryKey: ["agents"],
    queryFn: fetchAgents,
    refetchInterval: 15000,
  });
}
