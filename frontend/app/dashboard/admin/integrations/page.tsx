/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Settings, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useIntegrations } from '@/lib/hooks/useIntegrations';
import type { IntegrationStatus } from '@/lib/api';

export default function IntegrationsPage() {
  const { data: integrations = [], isLoading, refetch } = useIntegrations();

  return (
    <div className="space-y-6 text-slate-100">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Channels</p>
          <h1 className="text-2xl font-semibold text-white">Integrations</h1>
          <p className="text-sm text-slate-400">Connect channels and webhooks to enable outbound messaging.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="mae-button primary text-xs inline-flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage
          </button>
          <button className="mae-button ghost text-xs inline-flex items-center gap-2" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((i: IntegrationStatus) => (
          <article key={i.id} className="glass-panel border border-white/10 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{i.name}</h3>
                <p className="text-xs text-slate-400">{i.id}</p>
              </div>
              <div className="text-right">
                {i.status === 'connected' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                ) : i.status === 'pending' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                ) : (
                  <LinkIcon className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">{i.lastEvent}</p>
              <div className="flex items-center gap-2">
                <button className="mae-button ghost text-xs">Logs</button>
                <button className="mae-button primary text-xs" onClick={() => refetch()}>Refresh</button>
              </div>
            </div>
          </article>
        ))}
        {isLoading && <div className="text-slate-500 text-sm">Loading integrations…</div>}
        {!isLoading && integrations.length === 0 && (
          <div className="text-slate-500 text-sm">No integrations found.</div>
        )}
      </div>
    </div>
  );
}
