/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Automations Admin Page - Manage system + user-defined workflow automations
 */

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassTable } from '@/components/ui/GlassTable';
import Card from '@/components/ui/Card';
import { 
  Zap, Clock, MessageSquare, Power, Plus, X, Play, 
  TrendingUp, Bell, GitBranch, Users, Settings, Webhook,
  CheckCircle2, AlertCircle, Activity, Trash2, Edit2
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface SystemAutomation {
  id: string;
  name: string;
  cadence: string;
  owner: string;
  status: 'healthy' | 'warning' | 'paused';
  lastRun: string;
  type: 'system';
}

interface UserAutomation {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  actionType: string;
  totalExecutions: number;
  successRate: number;
  lastExecutedAt: string | null;
  type: 'user';
}

interface AutomationsResponse {
  system: SystemAutomation[];
  user: UserAutomation[];
  total: number;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchAutomations(): Promise<AutomationsResponse> {
  const res = await fetch('/api/automations');
  if (!res.ok) throw new Error('Failed to fetch automations');
  return res.json();
}

async function createAutomation(data: any) {
  const res = await fetch('/api/automations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create automation');
  }
  return res.json();
}

async function toggleAutomation(id: string, isActive: boolean) {
  const res = await fetch(`/api/automations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) throw new Error('Failed to toggle automation');
  return res.json();
}

async function deleteAutomation(id: string) {
  const res = await fetch(`/api/automations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete automation');
  return res.json();
}

async function executeAutomation(id: string) {
  const res = await fetch(`/api/automations/${id}/execute`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to execute automation');
  return res.json();
}

// ============================================================================
// Trigger/Action Options
// ============================================================================

const TRIGGER_OPTIONS = [
  { value: 'lead_score_change', label: 'Lead Score Changes', icon: TrendingUp },
  { value: 'new_lead', label: 'New Lead Created', icon: Plus },
  { value: 'sms_received', label: 'SMS Received', icon: MessageSquare },
  { value: 'call_ended', label: 'Call Ended', icon: Clock },
  { value: 'call_missed', label: 'Call Missed', icon: AlertCircle },
  { value: 'status_change', label: 'Status Changed', icon: Activity },
  { value: 'tier_upgrade', label: 'Tier Upgraded', icon: TrendingUp },
];

const ACTION_OPTIONS = [
  { value: 'send_notification', label: 'Send Notification', icon: Bell },
  { value: 'enroll_sequence', label: 'Enroll in Sequence', icon: GitBranch },
  { value: 'assign_agent', label: 'Assign to Agent', icon: Users },
  { value: 'update_status', label: 'Update Status', icon: Settings },
  { value: 'webhook', label: 'Call Webhook', icon: Webhook },
];

// ============================================================================
// Create Automation Modal
// ============================================================================

function CreateAutomationModal({ 
  isOpen, 
  onClose,
  onCreated 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('lead_score_change');
  const [actionType, setActionType] = useState('send_notification');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: createAutomation,
    onSuccess: () => {
      onCreated();
      onClose();
      setName('');
      setDescription('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white">Create Automation</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Hot Lead Alert"
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this automation do?"
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">When this happens...</label>
            <div className="grid grid-cols-2 gap-2">
              {TRIGGER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTriggerType(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left text-sm ${
                    triggerType === opt.value
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-slate-700 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Do this...</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setActionType(opt.value)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left text-sm ${
                    actionType === opt.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-700 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({ name, description, triggerType, actionType })}
            disabled={!name || mutation.isPending}
            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50"
          >
            {mutation.isPending ? 'Creating...' : 'Create Automation'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'user'>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['automations'],
    queryFn: fetchAutomations,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => toggleAutomation(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['automations'] }),
  });

  const executeMutation = useMutation({
    mutationFn: executeAutomation,
  });

  const systemAutomations = data?.system || [];
  const userAutomations = data?.user || [];

  // Filter based on active tab
  const showSystem = activeTab === 'all' || activeTab === 'system';
  const showUser = activeTab === 'all' || activeTab === 'user';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Zap className="text-amber-400" size={28} />
            Auto-Pilot Workflows
          </h2>
          <p className="text-slate-400 text-sm mt-1">Configure automated actions triggered by events.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={16} />
          New Automation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: 'All', count: systemAutomations.length + userAutomations.length },
          { id: 'system', label: 'System', count: systemAutomations.length },
          { id: 'user', label: 'Custom', count: userAutomations.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
            <span className="ml-2 text-xs text-slate-500">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* System Automations */}
      {showSystem && systemAutomations.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings size={18} className="text-slate-400" />
            System Workflows
          </h3>
          <div className="divide-y divide-white/5">
            {systemAutomations.map((auto) => (
              <div key={auto.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    auto.status === 'healthy' ? 'bg-emerald-500/20' :
                    auto.status === 'warning' ? 'bg-amber-500/20' : 'bg-slate-700'
                  }`}>
                    <Activity size={18} className={
                      auto.status === 'healthy' ? 'text-emerald-400' :
                      auto.status === 'warning' ? 'text-amber-400' : 'text-slate-500'
                    } />
                  </div>
                  <div>
                    <div className="text-white font-medium">{auto.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock size={12} />
                      {auto.cadence}
                      <span className="text-slate-600">•</span>
                      {auto.owner}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    auto.status === 'healthy' ? 'bg-emerald-500/20 text-emerald-400' :
                    auto.status === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {auto.status.toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-500">
                    {auto.lastRun === 'never' ? 'Never run' : new Date(auto.lastRun).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User Automations */}
      {showUser && (
        <Card>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap size={18} className="text-amber-400" />
            Custom Workflows
          </h3>
          
          {userAutomations.length === 0 ? (
            <div className="py-12 text-center">
              <Zap size={40} className="mx-auto text-slate-600 mb-3" />
              <div className="text-slate-400 font-medium">No custom automations yet</div>
              <div className="text-sm text-slate-500 mt-1">Create your first automation to get started</div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all"
              >
                Create Automation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {userAutomations.map((auto) => (
                <div key={auto.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      auto.isActive ? 'bg-emerald-500/20' : 'bg-slate-700'
                    }`}>
                      <Zap size={18} className={auto.isActive ? 'text-emerald-400' : 'text-slate-500'} />
                    </div>
                    <div>
                      <div className="text-white font-medium">{auto.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="capitalize">{auto.triggerType.replace(/_/g, ' ')}</span>
                        <span className="text-slate-600">→</span>
                        <span className="capitalize">{auto.actionType.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {auto.totalExecutions > 0 && (
                      <div className="text-xs text-slate-500 mr-2">
                        {auto.totalExecutions} runs • {auto.successRate}% success
                      </div>
                    )}
                    <button
                      onClick={() => executeMutation.mutate(auto.id)}
                      disabled={!auto.isActive}
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                      title="Run now"
                    >
                      <Play size={16} />
                    </button>
                    <button
                      onClick={() => toggleMutation.mutate({ id: auto.id, isActive: !auto.isActive })}
                      className={`p-2 rounded-lg transition-colors ${
                        auto.isActive 
                          ? 'text-emerald-400 hover:bg-emerald-500/10' 
                          : 'text-slate-500 hover:text-white hover:bg-slate-700'
                      }`}
                      title={auto.isActive ? 'Disable' : 'Enable'}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this automation?')) {
                          deleteMutation.mutate(auto.id);
                        }
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {isLoading && (
        <div className="text-slate-500 text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          Loading automations…
        </div>
      )}

      {/* Create Modal */}
      <CreateAutomationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['automations'] })}
      />
    </div>
  );
}
