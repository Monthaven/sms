"use client";

import { useQuery } from "@tanstack/react-query";
import { IntegrationStatus, fetchIntegrations } from "../api";

export function useIntegrations() {
  return useQuery<IntegrationStatus[]>({
    queryKey: ["integrations"],
    queryFn: fetchIntegrations,
    refetchInterval: 45000,
  });
}
