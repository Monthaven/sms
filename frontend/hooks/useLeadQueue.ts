import useSWR from "swr";

type QueueItem = {
  lead: {
    id: string;
    status: string;
    callbackAt?: string | null;
    assignedTo?: string | null;
  };
  contact: {
    name: string | null;
    phone: string | null;
    email?: string | null;
    score: number;
    priority: string;
    intent?: string | null;
  };
  property: {
    address: string;
    city: string;
    state: string;
    units: number;
    value: number;
  } | null;
};

type QueueResponse = {
  success: boolean;
  data?: { leads: QueueItem[] };
  meta?: { total: number; page: number; pageSize: number };
  error?: { message: string };
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useLeadQueue(filter: string, sort: string) {
  const { data, error, isLoading, mutate } = useSWR<QueueResponse>(
    `/api/sms/queue?priority=${filter}&sort=${sort}`,
    fetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
    }
  );

  return {
    leads: data?.data?.leads ?? [],
    total: data?.meta?.total ?? 0,
    isLoading,
    error: error ? error.message : data?.success === false ? data.error?.message ?? "Failed to load queue" : null,
    refresh: mutate,
  };
}
