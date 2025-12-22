/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

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
