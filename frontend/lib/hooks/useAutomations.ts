/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

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
