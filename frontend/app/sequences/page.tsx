/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Sequences List Page - View and manage all SMS sequences
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Users, 
  MessageSquare,
  Clock,
  TrendingUp,
  MoreVertical,
  Search,
  Filter
} from 'lucide-react';
import Card from '@/components/ui/Card';
import PageFooterRail from '@/components/PageFooterRail';

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

interface SequenceStep {
  id: string;
  stepNumber: number;
  name: string;
  template: string;
  delayDays: number;
}

async function fetchSequences(): Promise<Sequence[]> {
  const res = await fetch('/api/sequences');
  if (!res.ok) throw new Error('Failed to fetch sequences');
  return res.json();
}

async function createSequence(data: { name: string; description?: string }): Promise<Sequence> {
  const res = await fetch('/api/sequences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create sequence');
  return res.json();
}

async function deleteSequence(id: string): Promise<void> {
  const res = await fetch(`/api/sequences/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete sequence');
}

async function toggleSequenceStatus(id: string, status: string): Promise<Sequence> {
  const newStatus = status === 'active' ? 'paused' : 'active';
  const res = await fetch(`/api/sequences/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
  if (!res.ok) throw new Error('Failed to update sequence');
  return res.json();
}

export default function SequencesPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSequenceName, setNewSequenceName] = useState('');
  const [newSequenceDesc, setNewSequenceDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ['sequences'],
    queryFn: fetchSequences,
  });

  const createMutation = useMutation({
    mutationFn: createSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      setShowCreateModal(false);
      setNewSequenceName('');
      setNewSequenceDesc('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSequence,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequences'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => toggleSequenceStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sequences'] }),
  });

  const filteredSequences = sequences.filter((seq) => {
    const matchesSearch = seq.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || seq.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: sequences.length,
    active: sequences.filter(s => s.status === 'active').length,
    totalContacts: sequences.reduce((sum, s) => sum + (s._count?.SequenceContact || s.totalContacts || 0), 0),
    totalSent: sequences.reduce((sum, s) => sum + (s.messagesSent || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sequences</h1>
          <p className="text-slate-400 text-sm">Automated multi-step SMS campaigns</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <Plus size={16} />
          New Sequence
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-slate-400">Total Sequences</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="text-2xl font-bold text-emerald-400">{stats.active}</div>
          <div className="text-xs text-slate-400">Active</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="text-2xl font-bold text-blue-400">{stats.totalContacts.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Enrolled Contacts</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10">
          <div className="text-2xl font-bold text-purple-400">{stats.totalSent.toLocaleString()}</div>
          <div className="text-xs text-slate-400">Messages Sent</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search sequences..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Sequences Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel p-6 rounded-xl border border-white/10 animate-pulse">
              <div className="h-6 w-32 bg-slate-700 rounded mb-3" />
              <div className="h-4 w-48 bg-slate-800 rounded mb-4" />
              <div className="h-20 bg-slate-800/50 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSequences.length === 0 ? (
        <div className="glass-panel p-12 rounded-xl border border-white/10 text-center">
          <MessageSquare size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No sequences found</h3>
          <p className="text-slate-400 text-sm mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'Create your first automated SMS sequence'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Create Sequence
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSequences.map((sequence) => (
            <SequenceCard
              key={sequence.id}
              sequence={sequence}
              onToggle={() => toggleMutation.mutate({ id: sequence.id, status: sequence.status || 'draft' })}
              onDelete={() => {
                if (confirm('Delete this sequence? This cannot be undone.')) {
                  deleteMutation.mutate(sequence.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-white mb-4">Create New Sequence</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ name: newSequenceName, description: newSequenceDesc });
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Sequence Name *
                  </label>
                  <input
                    type="text"
                    value={newSequenceName}
                    onChange={(e) => setNewSequenceName(e.target.value)}
                    placeholder="e.g., New Lead Follow-up"
                    required
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSequenceDesc}
                    onChange={(e) => setNewSequenceDesc(e.target.value)}
                    placeholder="What is this sequence for?"
                    rows={3}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newSequenceName || createMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PageFooterRail />
    </div>
  );
}

function SequenceCard({ 
  sequence, 
  onToggle, 
  onDelete 
}: { 
  sequence: Sequence; 
  onToggle: () => void; 
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const enrolledCount = sequence._count?.SequenceContact || sequence.totalContacts || 0;
  const stepCount = sequence.steps?.length || 0;
  
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };

  return (
    <div className="glass-panel p-5 rounded-xl border border-white/10 hover:border-white/20 transition-colors group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <Link href={`/sequences/${sequence.id}`} className="block">
            <h3 className="text-lg font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
              {sequence.name}
            </h3>
          </Link>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${statusColors[sequence.status || 'draft']}`}>
            {(sequence.status || 'draft').toUpperCase()}
          </span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 py-1">
                <Link
                  href={`/sequences/${sequence.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  <Edit3 size={14} />
                  Edit
                </Link>
                <button
                  onClick={() => { onToggle(); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white w-full"
                >
                  {sequence.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                  {sequence.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      {sequence.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{sequence.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-semibold text-white">{stepCount}</div>
          <div className="text-[10px] text-slate-500 uppercase">Steps</div>
        </div>
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-semibold text-blue-400">{enrolledCount}</div>
          <div className="text-[10px] text-slate-500 uppercase">Enrolled</div>
        </div>
        <div className="text-center p-2 bg-slate-800/50 rounded-lg">
          <div className="text-lg font-semibold text-emerald-400">{sequence.responses || 0}</div>
          <div className="text-[10px] text-slate-500 uppercase">Responses</div>
        </div>
      </div>

      {/* Steps Preview */}
      {stepCount > 0 && (
        <div className="flex items-center gap-1 mb-3">
          {sequence.steps.slice(0, 5).map((step, i) => (
            <div
              key={step.id}
              className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden"
              title={`Step ${step.stepNumber}: ${step.name}`}
            >
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: i < 2 ? '100%' : '0%' }}
              />
            </div>
          ))}
          {stepCount > 5 && (
            <span className="text-[10px] text-slate-500">+{stepCount - 5}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href={`/sequences/${sequence.id}`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
        >
          <Edit3 size={14} />
          Edit Steps
        </Link>
        <Link
          href={`/sequences/${sequence.id}/enroll`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-sm transition-colors"
        >
          <Users size={14} />
          Enroll
        </Link>
      </div>
    </div>
  );
}
