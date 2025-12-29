/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Sequence Detail Page - Edit sequence steps and settings
 */

'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Play,
  Pause,
  Users,
  MessageSquare,
  Clock,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
} from 'lucide-react';
import PageFooterRail from '@/components/PageFooterRail';

interface SequenceStep {
  id: string;
  sequenceId?: string;
  stepNumber: number;
  name: string;
  template: string;
  delayDays: number;
  skipIfResponded?: boolean;
  skipIfOptedOut?: boolean;
  createdAt?: string;
}

interface Sequence {
  id: string;
  name: string;
  description?: string;
  status: string;
  totalContacts: number;
  messagesSent: number;
  responses: number;
  hotLeads: number;
  optOuts: number;
  createdAt: string;
  updatedAt: string;
  steps: SequenceStep[];
  _count?: { SequenceContact: number };
}

async function fetchSequence(id: string): Promise<Sequence> {
  const res = await fetch(`/api/sequences/${id}`);
  if (!res.ok) throw new Error('Failed to fetch sequence');
  return res.json();
}

async function updateSequence(id: string, data: Partial<Sequence>): Promise<Sequence> {
  const res = await fetch(`/api/sequences/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update sequence');
  return res.json();
}

async function createStep(sequenceId: string, data: Partial<SequenceStep>): Promise<SequenceStep> {
  const res = await fetch(`/api/sequences/${sequenceId}/steps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create step');
  return res.json();
}

async function updateStep(sequenceId: string, stepId: string, data: Partial<SequenceStep>): Promise<SequenceStep> {
  const res = await fetch(`/api/sequences/${sequenceId}/steps/${stepId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update step');
  return res.json();
}

async function deleteStep(sequenceId: string, stepId: string): Promise<void> {
  const res = await fetch(`/api/sequences/${sequenceId}/steps/${stepId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete step');
}

const MESSAGE_TEMPLATES = [
  { name: 'Introduction', template: 'Hi {{firstName}}, I noticed you own the property at {{address}}. Are you considering selling?' },
  { name: 'Follow-up', template: 'Hi {{firstName}}, just following up on my previous message about {{address}}. Would you be open to discussing options?' },
  { name: 'Value Offer', template: '{{firstName}}, I have buyers interested in properties like yours at {{address}}. Would a quick cash offer interest you?' },
  { name: 'Final Touch', template: 'Hi {{firstName}}, this is my last reach out about {{address}}. If you ever want to discuss, feel free to reply anytime.' },
];

export default function SequenceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sequenceId = params.id as string;

  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { data: sequence, isLoading, error } = useQuery({
    queryKey: ['sequence', sequenceId],
    queryFn: () => fetchSequence(sequenceId),
    enabled: !!sequenceId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Sequence>) => updateSequence(sequenceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', sequenceId] });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      setEditingName(false);
    },
  });

  const createStepMutation = useMutation({
    mutationFn: (data: Partial<SequenceStep>) => createStep(sequenceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence', sequenceId] });
      setShowAddStep(false);
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, data }: { stepId: string; data: Partial<SequenceStep> }) => 
      updateStep(sequenceId, stepId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequence', sequenceId] }),
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) => deleteStep(sequenceId, stepId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequence', sequenceId] }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-700 rounded animate-pulse" />
        <div className="h-64 bg-slate-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !sequence) {
    return (
      <div className="glass-panel p-12 rounded-xl border border-red-500/30 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Sequence Not Found</h2>
        <p className="text-slate-400 mb-4">The sequence you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/sequences" className="text-blue-400 hover:underline">
          ← Back to Sequences
        </Link>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  const enrolledCount = sequence._count?.SequenceContact || sequence.totalContacts || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/sequences"
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name || sequence.name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold bg-transparent border-b border-blue-500 text-white focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => updateMutation.mutate({ name: name || sequence.name })}
                  className="p-1 text-emerald-400 hover:text-emerald-300"
                >
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => { setName(sequence.name); setEditingName(true); }}
              >
                {sequence.name}
              </h1>
            )}
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[sequence.status || 'draft']}`}>
                {(sequence.status || 'draft').toUpperCase()}
              </span>
              <span className="text-slate-500 text-sm">{sequence.steps?.length || 0} steps</span>
              <span className="text-slate-500 text-sm">•</span>
              <span className="text-slate-500 text-sm">{enrolledCount} enrolled</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Settings size={18} />
          </button>
          <Link
            href={`/sequences/${sequenceId}/enroll`}
            className="inline-flex items-center gap-2 px-4 py-2 border border-blue-500/30 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors"
          >
            <Users size={16} />
            Enroll Contacts
          </Link>
          <button
            onClick={() => updateMutation.mutate({ 
              status: sequence.status === 'active' ? 'paused' : 'active' 
            })}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sequence.status === 'active'
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {sequence.status === 'active' ? (
              <>
                <Pause size={16} />
                Pause
              </>
            ) : (
              <>
                <Play size={16} />
                Activate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Panel (collapsible) */}
      {showSettings && (
        <div className="glass-panel p-6 rounded-xl border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Sequence Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
              <input
                type="text"
                value={name || sequence.name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
              <select
                value={sequence.status || 'draft'}
                onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={description || sequence.description || ''}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => updateMutation.mutate({ 
                name: name || sequence.name, 
                description: description || sequence.description 
              })}
              disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
          <div className="text-2xl font-bold text-white">{sequence.steps?.length || 0}</div>
          <div className="text-xs text-slate-400">Steps</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
          <div className="text-2xl font-bold text-blue-400">{enrolledCount}</div>
          <div className="text-xs text-slate-400">Enrolled</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
          <div className="text-2xl font-bold text-purple-400">{sequence.messagesSent || 0}</div>
          <div className="text-xs text-slate-400">Sent</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
          <div className="text-2xl font-bold text-emerald-400">{sequence.responses || 0}</div>
          <div className="text-xs text-slate-400">Responses</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
          <div className="text-2xl font-bold text-rose-400">{sequence.optOuts || 0}</div>
          <div className="text-xs text-slate-400">Opt-Outs</div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare size={18} className="text-blue-400" />
            Sequence Steps
          </h2>
          <button
            onClick={() => setShowAddStep(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Add Step
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {(!sequence.steps || sequence.steps.length === 0) ? (
            <div className="p-12 text-center">
              <MessageSquare size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No steps yet</h3>
              <p className="text-slate-400 text-sm mb-4">Add your first message step to this sequence</p>
              <button
                onClick={() => setShowAddStep(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add First Step
              </button>
            </div>
          ) : (
            sequence.steps
              .sort((a, b) => a.stepNumber - b.stepNumber)
              .map((step, index) => (
                <StepEditor
                  key={step.id}
                  step={step}
                  index={index}
                  isExpanded={expandedStep === step.id}
                  onToggle={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                  onUpdate={(data) => updateStepMutation.mutate({ stepId: step.id, data })}
                  onDelete={() => {
                    if (confirm('Delete this step?')) {
                      deleteStepMutation.mutate(step.id);
                    }
                  }}
                  isUpdating={updateStepMutation.isPending}
                />
              ))
          )}
        </div>
      </div>

      {/* Add Step Modal */}
      {showAddStep && (
        <AddStepModal
          onClose={() => setShowAddStep(false)}
          onCreate={(data) => createStepMutation.mutate(data)}
          nextStepNumber={(sequence.steps?.length || 0) + 1}
          isCreating={createStepMutation.isPending}
        />
      )}

      <PageFooterRail />
    </div>
  );
}

function StepEditor({
  step,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  step: SequenceStep;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Partial<SequenceStep>) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const [name, setName] = useState(step.name);
  const [template, setTemplate] = useState(step.template);
  const [delayDays, setDelayDays] = useState(step.delayDays);
  const [skipIfResponded, setSkipIfResponded] = useState(step.skipIfResponded ?? true);
  const [skipIfOptedOut, setSkipIfOptedOut] = useState(step.skipIfOptedOut ?? true);

  const hasChanges = 
    name !== step.name ||
    template !== step.template ||
    delayDays !== step.delayDays ||
    skipIfResponded !== step.skipIfResponded ||
    skipIfOptedOut !== step.skipIfOptedOut;

  return (
    <div className="group">
      {/* Step Header */}
      <div
        className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
        onClick={onToggle}
      >
        <div className="text-slate-600">
          <GripVertical size={16} />
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-sm">
          {step.stepNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-white">{step.name}</div>
          <div className="text-sm text-slate-500 truncate">{step.template}</div>
        </div>
        <div className="flex items-center gap-3 text-slate-400 text-sm">
          <div className="flex items-center gap-1">
            <Clock size={14} />
            {index === 0 ? 'Immediate' : `Day ${step.delayDays}`}
          </div>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Step Editor (expanded) */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 bg-slate-800/20 border-t border-white/5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Step Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Delay (Days after previous step)
                </label>
                <input
                  type="number"
                  value={delayDays}
                  onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
                  min={0}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Message Template
              </label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
                placeholder="Hi {{firstName}}, ..."
              />
              <p className="text-xs text-slate-500 mt-1">
                Available variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{address}}'}, {'{{city}}'}
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipIfResponded}
                  onChange={(e) => setSkipIfResponded(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                Skip if contact has responded
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipIfOptedOut}
                  onChange={(e) => setSkipIfOptedOut(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                Skip if opted out
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm transition-colors"
              >
                <Trash2 size={14} />
                Delete Step
              </button>
              <button
                onClick={() => onUpdate({ name, template, delayDays, skipIfResponded, skipIfOptedOut })}
                disabled={!hasChanges || isUpdating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={14} />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddStepModal({
  onClose,
  onCreate,
  nextStepNumber,
  isCreating,
}: {
  onClose: () => void;
  onCreate: (data: Partial<SequenceStep>) => void;
  nextStepNumber: number;
  isCreating: boolean;
}) {
  const [name, setName] = useState(`Step ${nextStepNumber}`);
  const [template, setTemplate] = useState('');
  const [delayDays, setDelayDays] = useState(nextStepNumber === 1 ? 0 : 2);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    { name: 'Introduction', template: 'Hi {{firstName}}, I noticed you own the property at {{address}}. Are you considering selling?' },
    { name: 'Follow-up', template: 'Hi {{firstName}}, just following up on my previous message about {{address}}. Would you be open to discussing options?' },
    { name: 'Value Offer', template: '{{firstName}}, I have buyers interested in properties like yours at {{address}}. Would a quick cash offer interest you?' },
    { name: 'Final Touch', template: 'Hi {{firstName}}, this is my last reach out about {{address}}. If you ever want to discuss, feel free to reply anytime.' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-white mb-4">Add New Step</h2>

        {/* Quick Templates */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Quick Templates</label>
          <div className="grid grid-cols-2 gap-2">
            {templates.map((t) => (
              <button
                key={t.name}
                onClick={() => {
                  setSelectedTemplate(t.name);
                  setName(t.name);
                  setTemplate(t.template);
                }}
                className={`p-3 rounded-lg border text-left text-sm transition-colors ${
                  selectedTemplate === t.name
                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                    : 'border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Step Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Delay (Days after previous step)
            </label>
            <input
              type="number"
              value={delayDays}
              onChange={(e) => setDelayDays(parseInt(e.target.value) || 0)}
              min={0}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Message Template</label>
            <textarea
              value={template}
              onChange={(e) => { setTemplate(e.target.value); setSelectedTemplate(null); }}
              rows={4}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Hi {{firstName}}, ..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{address}}'}, {'{{city}}'}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate({ 
              name, 
              template, 
              delayDays, 
              stepNumber: nextStepNumber,
              skipIfResponded: true,
              skipIfOptedOut: true,
            })}
            disabled={!name || !template || isCreating}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Adding...' : 'Add Step'}
          </button>
        </div>
      </div>
    </div>
  );
}
