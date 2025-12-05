"use client";

import React, { useState } from "react";
import { Layout, Database, RefreshCw, ExternalLink, Plug } from "lucide-react";
import { THEME } from "@/lib/theme";

export default function IntelligencePage() {
  const [viewMode, setViewMode] = useState<"native" | "metabase">("metabase");
  const [isConnected, setIsConnected] = useState(true);

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div
        className={`flex h-16 items-center justify-between border-b ${THEME.border} bg-[#0B0F19]/95 px-8 backdrop-blur`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode("native")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              viewMode === "native"
                ? "bg-[#1E2538] text-white shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <Layout size={16} /> Native Stats
            </span>
          </button>
          <button
            onClick={() => setViewMode("metabase")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              viewMode === "metabase"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/50"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <span className="flex items-center gap-2">
              <Database size={16} /> Metabase BI
            </span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-[#2A3449] bg-[#151B2D] px-3 py-1.5">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? "animate-pulse bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="text-[10px] font-mono uppercase text-gray-400">
              {isConnected ? "Live Connection" : "Disconnected"}
            </span>
          </div>
          <button
            className="p-2 text-gray-500 transition-colors hover:text-white"
            onClick={() => setIsConnected((prev) => !prev)}
          >
            <RefreshCw size={18} />
          </button>
          <button className="p-2 text-gray-500 transition-colors hover:text-white">
            <ExternalLink size={18} />
          </button>
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden bg-[#0f121b]">
        {viewMode === "metabase" ? (
          isConnected ? (
            <div className="flex h-full flex-col">
              <div className="relative flex-1 bg-white">
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 text-gray-900">
                  <div className="space-y-4 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl">
                      <Database size={32} />
                    </div>
                    <h3 className="text-2xl font-bold">Metabase Dashboard</h3>
                    <p className="mx-auto max-w-md text-gray-500">
                      Successfully connected to Monthaven Data Warehouse.
                      <br />
                      <span className="mt-2 inline-block rounded bg-gray-200 px-2 py-1 text-xs font-mono">
                        postgres://production-db:5432/analytics
                      </span>
                    </p>
                    <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-4 opacity-50">
                      <div className="h-40 rounded border border-gray-200 bg-white shadow" />
                      <div className="h-40 rounded border border-gray-200 bg-white shadow" />
                      <div className="col-span-2 h-40 rounded border border-gray-200 bg-white shadow" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-500">
              <Plug size={48} className="mb-4 text-gray-700" />
              <h3 className="text-lg font-medium text-gray-300">
                Connection Lost
              </h3>
              <p className="text-sm">Could not verify token with Metabase server.</p>
            </div>
          )
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-gray-500">
            Native charts coming soon.
          </div>
        )}
      </div>
    </div>
  );
}
