/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { useLeads } from "@/lib/hooks/useLeads";
import { useAgents, type AgentPresence } from "@/lib/hooks/useAgents";
import { type Lead } from "@/lib/api";
import { useMemo } from "react";

export function useDashboardStats() {
  // 1. Fetch data from your existing hooks
  const { leads = [], isLoading: leadsLoading } = useLeads();
  const { data: agents = [], isLoading: agentsLoading } = useAgents();

  // 2. Calculate Metrics
  const stats = useMemo(() => {
    const leadArray: Lead[] = Array.isArray(leads) ? leads : [];
    const totalLeads = leadArray.length;
    const hotLeads = leadArray.filter((l) => l.status === "RESP_HOT" || l.status === "HOT").length;

    const agentArray: AgentPresence[] = Array.isArray(agents) ? agents : [];
    const activeAgents = agentArray.filter((a) => a.status === 'online' || a.status === 'away').length;
    const totalAgents = agentArray.length || 1; // Prevent divide by zero

    // Build spark series for the last 10 days
    const buildSeries = (predicate?: (l: Lead) => boolean) => {
      const series: { v: number }[] = [];
      for (let i = 9; i >= 0; i--) {
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        dayStart.setUTCDate(dayStart.getUTCDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayStart.getUTCDate() + 1);
        const count = leadArray.filter((l) => {
          const ts = l.updatedAt;
          if (!ts) return false;
          const d = new Date(ts);
          return d >= dayStart && d < dayEnd && (predicate ? predicate(l) : true);
        }).length;
        series.push({ v: count });
      }
      return series;
    };

    const sparkTotal = buildSeries();
    const sparkHot = buildSeries((l) => l.status === "RESP_HOT" || l.status === "HOT");

    const trendDelta = sparkTotal.length >= 2
      ? sparkTotal[sparkTotal.length - 1].v - sparkTotal[sparkTotal.length - 2].v
      : 0;

    // Recent Activity (Sort by newest)
    const recentActivity = leadArray
      .filter((l) => l.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    const queueCount = leadArray.filter((l) => l.status === "QUEUED_FOR_CALL").length;

    return {
      totalLeads,
      hotLeads,
      activeAgents,
      totalAgents,
      recentActivity,
      leadGrowth: trendDelta >= 0 ? `+${trendDelta}` : `${trendDelta}`,
      sparkTotal,
      sparkHot,
      queueCount,
    };
  }, [leads, agents]);

  return {
    stats,
    agents,
    isLoading: leadsLoading || agentsLoading,
  };
}
