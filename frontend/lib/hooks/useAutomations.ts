"use client";

import { useQuery } from "@tanstack/react-query";
import { AutomationRow, fetchAutomations } from "../api";

export function useAutomations() {
  return useQuery<AutomationRow[]>({
    queryKey: ["automations"],
    queryFn: fetchAutomations,
    refetchInterval: 60000,
  });
}
