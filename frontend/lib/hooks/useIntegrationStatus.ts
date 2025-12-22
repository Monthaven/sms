/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

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
