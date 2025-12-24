/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Integrations Page - Manage Twilio/EzTexting and other connections
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Settings, RefreshCw, Link as LinkIcon, Phone, Zap, Plug } from 'lucide-react';
import { useIntegrations } from '@/lib/hooks/useIntegrations';
import type { IntegrationStatus } from '@/lib/api';
import IntegrationModal, { IntegrationCard } from '@/components/IntegrationModal';
import PageFooterRail from '@/components/PageFooterRail';

type ProviderType = 'twilio' | 'eztexting';

export default function IntegrationsPage() {
  const { data: integrations = [], isLoading, refetch } = useIntegrations();
  const [modalProvider, setModalProvider] = useState<ProviderType | null>(null);

  return (
    <div className="space-y-8 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Channels</p>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Plug className="text-amber-400" size={28} />
            Integrations
          </h1>
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

      {/* Primary Integrations */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Messaging Providers
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <IntegrationCard provider="twilio" onClick={() => setModalProvider('twilio')} />
          <IntegrationCard provider="eztexting" onClick={() => setModalProvider('eztexting')} />
        </div>
      </section>

      {/* Other Integrations from API */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
          Additional Connections
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Loading state */}
          {isLoading && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-panel border border-white/10 p-4 animate-pulse">
                  <div className="h-5 w-24 bg-slate-700 rounded mb-2" />
                  <div className="h-4 w-16 bg-slate-800 rounded" />
                </div>
              ))}
            </>
          )}

          {/* Empty state */}
          {!isLoading && integrations.length === 0 && (
            <div className="glass-panel border border-white/10 p-6 col-span-full text-center">
              <Plug size={32} className="mx-auto text-slate-600 mb-3" />
              <div className="text-slate-400 font-medium">No additional integrations found</div>
              <div className="text-sm text-slate-500 mt-1">Configure Twilio or EzTexting above to get started</div>
            </div>
          )}

          {/* Integration cards */}
          {!isLoading && integrations.map((i: IntegrationStatus) => (
            <article key={i.id} className="glass-panel border border-white/10 p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{i.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{i.id}</p>
                </div>
                <div className="text-right">
                  {i.status === 'connected' ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : i.status === 'pending' ? (
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  ) : (
                    <LinkIcon className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                <p className="text-xs text-slate-500">{i.lastEvent || 'No recent events'}</p>
                <div className="flex items-center gap-2">
                  <button className="mae-button ghost text-xs">Logs</button>
                  <button className="mae-button primary text-xs" onClick={() => refetch()}>Refresh</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Integration Modal */}
      {modalProvider && (
        <IntegrationModal
          isOpen={true}
          onClose={() => setModalProvider(null)}
          provider={modalProvider}
        />
      )}

      {/* Footer Rail */}
      <PageFooterRail
        kicker="Need Help?"
        title="Configure webhooks in your provider dashboard"
        description="Copy the webhook URLs from the modal and paste them into Twilio or EzTexting settings."
        actions={[
          { label: 'Twilio Docs', href: 'https://www.twilio.com/docs', variant: 'ghost' },
          { label: 'EzTexting Docs', href: 'https://www.eztexting.com/api', variant: 'ghost' },
        ]}
      />
    </div>
  );
}
