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
