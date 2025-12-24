/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * IntegrationModal - Modal for managing Twilio/EzTexting integrations
 * Provides connection status, test webhook, and configuration
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, AlertTriangle, Loader2, ExternalLink, RefreshCw, Plug, Zap, Phone } from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// Types
// ============================================================================

type Provider = 'twilio' | 'eztexting';

interface IntegrationStatus {
  connected: boolean;
  lastChecked?: Date;
  error?: string;
  webhookUrl?: string;
}

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider;
  initialStatus?: IntegrationStatus;
}

// ============================================================================
// Provider Config
// ============================================================================

const PROVIDER_CONFIG = {
  twilio: {
    name: 'Twilio',
    color: 'red',
    icon: Phone,
    description: 'Voice calls and SMS messaging',
    docsUrl: 'https://www.twilio.com/docs',
    features: ['Inbound/Outbound Calls', 'SMS Messages', 'Webhook Events', 'Call Recording'],
  },
  eztexting: {
    name: 'EzTexting',
    color: 'blue', 
    icon: Zap,
    description: 'Bulk SMS and MMS campaigns',
    docsUrl: 'https://www.eztexting.com/api',
    features: ['Bulk SMS', 'MMS Support', 'Delivery Reports', 'Contact Sync'],
  },
};

// ============================================================================
// Main Component
// ============================================================================

export default function IntegrationModal({ isOpen, onClose, provider, initialStatus }: IntegrationModalProps) {
  const [status, setStatus] = useState<IntegrationStatus>(initialStatus || { connected: false });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const config = PROVIDER_CONFIG[provider];
  const Icon = config.icon;
  const colorClasses = {
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  };

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Test webhook connection
  const testWebhook = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const endpoint = provider === 'twilio' ? '/api/sms/webhooks/twilio' : '/api/sms/webhooks/eztexting';
      
      // First, check if the endpoint is reachable
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });

      if (response.ok || response.status === 400) {
        // 400 is expected without proper Twilio signature
        setTestResult({ 
          success: true, 
          message: 'Webhook endpoint is reachable and responding' 
        });
        setStatus(prev => ({ ...prev, connected: true, lastChecked: new Date() }));
      } else {
        throw new Error(`Endpoint returned ${response.status}`);
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to reach webhook' 
      });
      setStatus(prev => ({ ...prev, connected: false, error: 'Connection test failed' }));
    } finally {
      setTesting(false);
    }
  }, [provider]);

  // Copy webhook URL
  const copyWebhookUrl = useCallback(() => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const endpoint = provider === 'twilio' ? '/api/sms/webhooks/twilio' : '/api/sms/webhooks/eztexting';
    navigator.clipboard.writeText(`${baseUrl}${endpoint}`);
    setTestResult({ success: true, message: 'Webhook URL copied to clipboard!' });
    setTimeout(() => setTestResult(null), 2000);
  }, [provider]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="integration-modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f1729] border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            <div className={clsx(
              'w-12 h-12 rounded-xl border flex items-center justify-center',
              colorClasses[config.color as keyof typeof colorClasses]
            )}>
              <Icon size={24} />
            </div>
            <div>
              <h2 id="integration-modal-title" className="text-lg font-semibold text-white">
                {config.name} Integration
              </h2>
              <p className="text-sm text-slate-400">{config.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status */}
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Connection Status</span>
            <div className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium',
              status.connected 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            )}>
              {status.connected ? <Check size={12} /> : <AlertTriangle size={12} />}
              {status.connected ? 'Connected' : 'Not Connected'}
            </div>
          </div>
          {status.lastChecked && (
            <div className="mt-2 text-xs text-slate-500">
              Last checked: {status.lastChecked.toLocaleString()}
            </div>
          )}
        </div>

        {/* Webhook URL */}
        <div className="p-6 border-b border-slate-700/50">
          <label className="text-sm text-slate-400 block mb-2">Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto">
              {typeof window !== 'undefined' ? `${window.location.origin}/api/sms/webhooks/${provider}` : `/api/sms/webhooks/${provider}`}
            </code>
            <button
              onClick={copyWebhookUrl}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Configure this URL in your {config.name} dashboard as the webhook endpoint.
          </p>
        </div>

        {/* Features */}
        <div className="p-6 border-b border-slate-700/50">
          <span className="text-sm text-slate-400 block mb-3">Supported Features</span>
          <div className="grid grid-cols-2 gap-2">
            {config.features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-xs text-slate-300">
                <Check size={12} className="text-emerald-400" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={clsx(
            'mx-6 mt-6 p-3 rounded-lg flex items-center gap-2 text-sm',
            testResult.success 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          )}>
            {testResult.success ? <Check size={16} /> : <AlertTriangle size={16} />}
            {testResult.message}
          </div>
        )}

        {/* Actions */}
        <div className="p-6 flex items-center justify-between">
          <a
            href={config.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ExternalLink size={14} />
            View Documentation
          </a>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={testWebhook}
              disabled={testing}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                testing
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              )}
            >
              {testing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Test Webhook
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Hook for Integration Status
// ============================================================================

export function useIntegrationStatus(provider: Provider) {
  const [status, setStatus] = useState<IntegrationStatus>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check environment variables exist on server
        const response = await fetch(`/api/sms/integration-status?provider=${provider}`);
        if (response.ok) {
          const data = await response.json();
          setStatus({
            connected: data.configured,
            lastChecked: new Date(),
            webhookUrl: data.webhookUrl,
          });
        }
      } catch {
        setStatus({ connected: false, error: 'Failed to check status' });
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [provider]);

  return { status, loading };
}

// ============================================================================
// Quick Integration Status Card
// ============================================================================

interface IntegrationCardProps {
  provider: Provider;
  onClick: () => void;
}

export function IntegrationCard({ provider, onClick }: IntegrationCardProps) {
  const { status, loading } = useIntegrationStatus(provider);
  const config = PROVIDER_CONFIG[provider];
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className="glass-panel rounded-2xl p-5 border border-slate-700/50 hover:border-slate-600 transition-all text-left w-full group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={clsx(
          'w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105',
          provider === 'twilio' ? 'text-red-400 bg-red-500/10 border-red-500/20' : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        )}>
          <Icon size={24} />
        </div>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-slate-500" />
        ) : (
          <div className={clsx(
            'w-3 h-3 rounded-full',
            status.connected ? 'bg-emerald-400 shadow-lg shadow-emerald-500/50' : 'bg-amber-400'
          )} />
        )}
      </div>
      <h4 className="font-semibold text-white mb-1">{config.name}</h4>
      <p className="text-xs text-slate-400">{config.description}</p>
      <div className="mt-3 flex items-center gap-2 text-xs">
        <Plug size={12} className={status.connected ? 'text-emerald-400' : 'text-slate-500'} />
        <span className={status.connected ? 'text-emerald-400' : 'text-slate-500'}>
          {loading ? 'Checking...' : status.connected ? 'Connected' : 'Not configured'}
        </span>
      </div>
    </button>
  );
}
