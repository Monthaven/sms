"use client";

import { useQuery } from "@tanstack/react-query";
import { TwilioStatus, fetchTwilioStatus } from "../integrations";

export function useTwilioStatus() {
  return useQuery<TwilioStatus>({
    queryKey: ["twilio-status"],
    queryFn: fetchTwilioStatus,
    refetchInterval: 30000,
  });
}
