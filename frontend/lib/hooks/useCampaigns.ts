/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { CampaignSummary, fetchCampaigns } from "../api";

export function useCampaigns() {
  return useQuery<CampaignSummary[]>({
    queryKey: ["campaigns"],
    queryFn: fetchCampaigns,
    refetchInterval: 60000,
  });
}
