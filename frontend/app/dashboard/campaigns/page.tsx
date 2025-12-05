"use client";

import React from "react";
import { Megaphone, Plus, Clock, MoreHorizontal } from "lucide-react";
import { THEME } from "@/lib/theme";

export default function CampaignsPage() {
  const campaigns = [
    {
      id: "c1",
      name: "October Commercial Blast",
      type: "Blast",
      status: "Completed",
      leads: 450,
      sent: 442,
      responses: 38,
      lastRun: new Date("2023-10-15"),
    },
    {
      id: "c2",
      name: "Probate Follow-up Sequence",
      type: "Drip",
      status: "Running",
      leads: 120,
      sent: 85,
      responses: 12,
      lastRun: new Date(),
    },
    {
      id: "c3",
      name: "November Cash Buyers",
      type: "Blast",
      status: "Draft",
      leads: 800,
      sent: 0,
      responses: 0,
      lastRun: new Date(),
    },
  ];

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage outbound blasts and drip sequences.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-medium text-white shadow-lg shadow-indigo-900/50 transition-all hover:scale-105 hover:bg-indigo-500">
          <Plus size={18} /> New Campaign
        </button>
      </div>

      <div
        className={`${THEME.surface} flex-1 overflow-hidden rounded-2xl border ${THEME.border}`}
      >
        <table className="w-full border-collapse text-left">
          <thead className="bg-[#0f121b] text-xs font-bold uppercase tracking-wider text-gray-500">
            <tr>
              <th className="border-b border-gray-800 px-6 py-5">
                Campaign Name
              </th>
              <th className="border-b border-gray-800 px-6 py-5">Status</th>
              <th className="border-b border-gray-800 px-6 py-5">
                Performance
              </th>
              <th className="border-b border-gray-800 px-6 py-5">Last Run</th>
              <th className="border-b border-gray-800 px-6 py-5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {campaigns.map((c) => (
              <tr
                key={c.id}
                className="group transition-colors hover:bg-white/5"
              >
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-lg p-2.5 ${
                        c.type === "Blast"
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {c.type === "Blast" ? (
                        <Megaphone size={18} />
                      ) : (
                        <Clock size={18} />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-200 transition-colors group-hover:text-indigo-400">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-gray-500">{c.type}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                      c.status === "Running"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : c.status === "Completed"
                        ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                        : "border-gray-600 bg-gray-700/30 text-gray-400"
                    }`}
                  >
                    {c.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500">
                        Sent
                      </p>
                      <p className="text-sm font-bold text-white">
                        {c.sent}/{c.leads}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500">
                        Replies
                      </p>
                      <p className="text-sm font-bold text-emerald-400">
                        {c.responses}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 text-sm font-mono text-gray-500">
                  {c.lastRun.toLocaleDateString()}
                </td>
                <td className="px-6 py-5 text-right">
                  <button className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-white">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
