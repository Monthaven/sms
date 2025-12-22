/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { useQuery } from "@tanstack/react-query";
import { fetchLeads } from "@/lib/api";

export function useLeads(filters?: { statuses?: string[] | string }) {
  const statuses = filters?.statuses;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["leads", statuses ?? "all"],
    queryFn: async () => fetchLeads(statuses),
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });

  return { leads: data ?? [], isLoading: isLoading || isFetching };
}
