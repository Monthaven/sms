"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchLeads, Lead } from "../api";

type Options = {
  statuses?: string[] | string;
  queryKey?: string;
};

export function useLeads(options?: Options) {
  const keyBase = options?.queryKey ?? "leads";
  const statusKey = Array.isArray(options?.statuses)
    ? options?.statuses.sort().join(",")
    : options?.statuses || "all";

  return useQuery<Lead[]>({
    queryKey: [keyBase, statusKey],
    queryFn: () => fetchLeads(options?.statuses as string | string[] | undefined),
  });
}
