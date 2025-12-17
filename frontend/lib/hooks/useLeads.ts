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
