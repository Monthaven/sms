"use client";

import { useAgents } from "@/lib/hooks/useAgents";
import clsx from "clsx";

const statusColors: Record<string, string> = {
  online: "text-emerald-300",
  away: "text-amber-300",
  offline: "text-slate-500",
};

export default function AgentPresence() {
  const { data, isLoading, error } = useAgents();
  const agents = data ?? [];

  const stats = {
    online: agents.filter((a) => a.status === "online").length,
    away: agents.filter((a) => a.status === "away").length,
    offline: agents.filter((a) => a.status === "offline").length,
  };

  return (
    <div className="glass-panel border border-white/10 p-5 text-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Agents Online</p>
          <p className="text-2xl font-semibold text-white">
            {isLoading ? "--" : stats.online}
          </p>
        </div>
        <div className="avatar-stack">
          {isLoading && (
            <span style={{ zIndex: 1 }} className="animate-pulse text-slate-400">
              …
            </span>
          )}
          {!isLoading &&
            agents.slice(0, 4).map((agent, idx) => (
              <span key={agent.id} style={{ zIndex: agents.length - idx }}>
                {agent.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            ))}
          {!isLoading && agents.length > 4 && (
            <span style={{ zIndex: 0 }}>+{agents.length - 4}</span>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 text-center text-xs uppercase tracking-[0.3em] text-slate-500">
        <span className="text-emerald-300">{isLoading ? "--" : `${stats.online} Live`}</span>
        <span className="text-amber-300">{isLoading ? "--" : `${stats.away} Away`}</span>
        <span className="text-slate-400">{isLoading ? "--" : `${stats.offline} Offline`}</span>
      </div>

      {error && (
        <p className="mt-4 text-xs text-rose-200">
          Unable to load agent presence. {error.message}
        </p>
      )}

      {!isLoading && !error && (
        <div className="mt-4 space-y-2 text-xs text-slate-400">
          {agents.slice(0, 3).map((agent) => (
            <div key={agent.id} className="flex items-center justify-between">
              <span className="text-white">{agent.name}</span>
              <span className={clsx("uppercase tracking-[0.3em]", statusColors[agent.status])}>
                {agent.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
