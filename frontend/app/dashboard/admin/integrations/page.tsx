/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Integrations Page - Manage Twilio/EzTexting and other connections
 */

'use client';

import React, { useState } from 'react';
import { AlertTriangle, Settings, RefreshCw, Plug, Activity, PhoneCall, Loader2, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import { useIntegrations } from '@/lib/hooks/useIntegrations';
import type { IntegrationStatus } from '@/lib/api';
import IntegrationModal, { IntegrationCard } from '@/components/IntegrationModal';
import PageFooterRail from '@/components/PageFooterRail';

type ProviderType = 'twilio' | 'eztexting';

type HealthStatus = 'pass' | 'warn' | 'fail' | undefined;

type VoiceHealth = {
  ok?: boolean;
  issues?: string[];
  details?: {
    config?: { status?: HealthStatus; missingEnv?: string[] };
    twimlApp?: { status?: HealthStatus; voiceUrl?: string | null; expectedVoiceUrl?: string | null; reachable?: boolean | null };
    callerId?: { status?: HealthStatus; configuredNumber?: string | null; source?: string | null };
  };
  timestamp?: string;
};

type HealthEnvelope = {
  ok?: boolean;
  status?: number;
  payload?: VoiceHealth;
};

export default function IntegrationsPage() {
  const { data: integrations = [], isLoading, refetch } = useIntegrations();
  const [modalProvider, setModalProvider] = useState<ProviderType | null>(null);
  const [health, setHealth] = useState<HealthEnvelope | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; callSid?: string; to?: string } | null>(null);

  const statusChipClass = (status: HealthStatus) => {
    switch (status) {
      case 'pass':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'warn':
        return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
      case 'fail':
      default:
        return 'bg-red-500/10 text-red-300 border border-red-500/20';
    }
  };

  const runHealthCheck = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/voice-diagnostics');
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Health check failed');
      }
      setHealth(json.health || json);
    } catch (err: any) {
      setHealth({
        ok: false,
        status: 500,
        payload: {
          ok: false,
          issues: [err?.message || 'Health check failed'],
        },
      });
    } finally {
      setHealthLoading(false);
    }
  };

  const runOutboundTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/voice-diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outbound-test' }),
      });
      const json = await res.json();
      if (!res.ok || json?.ok === false) {
        throw new Error(json?.error || 'Test call failed');
      }
      setTestResult({
        ok: true,
        message: `Placed Twilio test call to ${json.to || '+15005550006'}`,
        callSid: json.callSid,
        to: json.to,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Test call failed',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const healthPayload = health?.payload;
  const timestamp = healthPayload?.timestamp ? new Date(healthPayload.timestamp).toLocaleString() : null;
  const configStatus = healthPayload?.details?.config?.status || (health?.ok ? 'pass' : undefined);
  const twimlStatus = healthPayload?.details?.twimlApp?.status;
  const callerIdStatus = healthPayload?.details?.callerId?.status;
  const missingEnv = healthPayload?.details?.config?.missingEnv;
  const twimlVoiceUrl = healthPayload?.details?.twimlApp?.voiceUrl;
  const callerIdNumber = healthPayload?.details?.callerId?.configuredNumber;
  const callerIdSource = healthPayload?.details?.callerId?.source;
  const issues = healthPayload?.issues || [];

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

      {/* Voice Diagnostics */}
      <section className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-400" />
              Voice Diagnostics
            </p>
            <h3 className="text-lg font-semibold text-white mt-1">Test inbound/outbound wiring</h3>
            <p className="text-sm text-slate-400">
              Run the Twilio health check and place a safe Twilio test call against outbound-connect.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runHealthCheck}
              disabled={healthLoading}
              className="mae-button ghost text-xs inline-flex items-center gap-2"
            >
              {healthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {healthLoading ? 'Checking...' : 'Run Health'}
            </button>
            <button
              onClick={runOutboundTest}
              disabled={testLoading}
              className="mae-button primary text-xs inline-flex items-center gap-2"
            >
              {testLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneCall className="h-4 w-4" />}
              {testLoading ? 'Calling...' : 'Outbound Test'}
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className={`rounded-xl px-4 py-3 border ${statusChipClass(configStatus)}`}>
            <div className="text-xs text-slate-400">Config</div>
            <div className="text-sm font-semibold text-white">Env + caller ID</div>
            {missingEnv?.length ? (
              <div className="text-[11px] text-red-200 mt-1">
                Missing: {missingEnv.join(', ')}
              </div>
            ) : null}
          </div>
          <div className={`rounded-xl px-4 py-3 border ${statusChipClass(twimlStatus)}`}>
            <div className="text-xs text-slate-400">TwiML App</div>
            <div className="text-sm font-semibold text-white">Voice URL & reachability</div>
            {twimlVoiceUrl && (
              <div className="text-[11px] text-slate-300 mt-1 truncate">
                {twimlVoiceUrl}
              </div>
            )}
          </div>
          <div className={`rounded-xl px-4 py-3 border ${statusChipClass(callerIdStatus)}`}>
            <div className="text-xs text-slate-400">Caller ID</div>
            <div className="text-sm font-semibold text-white">Ownership/verification</div>
            {callerIdNumber && (
              <div className="text-[11px] text-slate-300 mt-1">
                {callerIdNumber} ({callerIdSource || 'unknown'})
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Issues & warnings
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              {issues.length ? (
                issues.map((issue, idx) => (
                  <div key={idx} className="flex gap-2 text-slate-300">
                    <span className="text-amber-400">•</span>
                    <span>{issue}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500">No issues reported yet. Run the health check to populate results.</p>
              )}
            </div>
            {timestamp && (
              <div className="text-[11px] text-slate-500 mt-3">Last checked: {timestamp}</div>
            )}
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
              <PhoneCall className="h-4 w-4 text-emerald-400" />
              Outbound test call
            </div>
            <div className="text-sm text-slate-300">
              {testResult ? (
                <div className={`rounded-lg border px-3 py-2 ${testResult.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-red-500/30 bg-red-500/10 text-red-100'}`}>
                  <div className="font-semibold">{testResult.message}</div>
                  {testResult.callSid && (
                    <div className="text-[11px] text-slate-200 mt-1 font-mono">SID: {testResult.callSid}</div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">Runs a Twilio test call to +1 500 555 0006 via outbound-connect and dial-status.</p>
              )}
            </div>
          </div>
        </div>
      </section>

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
