/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Sequence Enrollment Page - Bulk enroll contacts into a sequence
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import PageFooterRail from '@/components/PageFooterRail';

interface Contact {
  id: string;
  phoneE164: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  dm_tier?: string;
  is_primary?: boolean;
  source?: string;
  createdAt: string;
  Property_Contact_propertyIdToProperty?: {
    addressLine1?: string;
    city?: string;
    state?: string;
  };
}

interface Sequence {
  id: string;
  name: string;
  status: string;
  steps: { id: string; stepNumber: number; name: string }[];
  _count?: { SequenceContact: number };
}

interface EnrollmentResult {
  enrolled: number;
  skipped: number;
  errors: string[];
}

async function fetchSequence(id: string): Promise<Sequence> {
  const res = await fetch(`/api/sequences/${id}`);
  if (!res.ok) throw new Error('Failed to fetch sequence');
  return res.json();
}

async function fetchContacts(params: {
  search?: string;
  tier?: string;
  limit?: number;
  offset?: number;
}): Promise<{ contacts: Contact[]; total: number }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.tier && params.tier !== 'all') query.set('tier', params.tier);
  query.set('limit', String(params.limit || 50));
  query.set('offset', String(params.offset || 0));
  
  const res = await fetch(`/api/contacts?${query}`);
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
}

async function enrollContacts(sequenceId: string, contactIds: string[]): Promise<EnrollmentResult> {
  const res = await fetch(`/api/sequences/${sequenceId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactIds }),
  });
  if (!res.ok) throw new Error('Failed to enroll contacts');
  return res.json();
}

export default function EnrollPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sequenceId = params.id as string;

  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrollResult, setEnrollResult] = useState<EnrollmentResult | null>(null);

  const { data: sequence, isLoading: loadingSequence } = useQuery({
    queryKey: ['sequence', sequenceId],
    queryFn: () => fetchSequence(sequenceId),
    enabled: !!sequenceId,
  });

  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ['contacts', { search, tier: tierFilter }],
    queryFn: () => fetchContacts({ search, tier: tierFilter, limit: 100 }),
  });

  const enrollMutation = useMutation({
    mutationFn: (contactIds: string[]) => enrollContacts(sequenceId, contactIds),
    onSuccess: (result) => {
      setEnrollResult(result);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['sequence', sequenceId] });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
    },
  });

  const contacts = contactsData?.contacts || [];
  const totalContacts = contactsData?.total || 0;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)));
    }
  };

  const handleEnroll = () => {
    if (selectedIds.size === 0) return;
    enrollMutation.mutate(Array.from(selectedIds));
  };

  if (loadingSequence) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (!sequence) {
    return (
      <div className="glass-panel p-12 rounded-xl border border-red-500/30 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Sequence Not Found</h2>
        <Link href="/sequences" className="text-blue-400 hover:underline">
          ← Back to Sequences
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/sequences/${sequenceId}`}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Enroll Contacts</h1>
          <p className="text-slate-400 text-sm">
            Add contacts to <span className="text-blue-400">{sequence.name}</span>
          </p>
        </div>
      </div>

      {/* Success/Result Banner */}
      {enrollResult && (
        <div className={`p-4 rounded-xl border ${enrollResult.errors.length > 0 ? 'border-amber-500/30 bg-amber-500/10' : 'border-emerald-500/30 bg-emerald-500/10'}`}>
          <div className="flex items-center gap-3">
            {enrollResult.errors.length > 0 ? (
              <AlertCircle className="text-amber-400" size={20} />
            ) : (
              <CheckCircle2 className="text-emerald-400" size={20} />
            )}
            <div className="flex-1">
              <div className="font-medium text-white">
                {enrollResult.enrolled} contact{enrollResult.enrolled !== 1 ? 's' : ''} enrolled successfully
                {enrollResult.skipped > 0 && `, ${enrollResult.skipped} skipped (already enrolled)`}
              </div>
              {enrollResult.errors.length > 0 && (
                <div className="text-sm text-amber-400 mt-1">
                  {enrollResult.errors.length} error{enrollResult.errors.length !== 1 ? 's' : ''} occurred
                </div>
              )}
            </div>
            <button onClick={() => setEnrollResult(null)} className="text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Sequence Info */}
      <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <Users className="text-blue-400" size={24} />
          </div>
          <div>
            <div className="font-semibold text-white">{sequence.name}</div>
            <div className="text-sm text-slate-400">
              {sequence.steps?.length || 0} steps • {sequence._count?.SequenceContact || 0} enrolled
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
          sequence.status === 'active' 
            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
        }`}>
          {(sequence.status || 'draft').toUpperCase()}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, phone, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          aria-label="Filter by DM tier"
          className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Tiers</option>
          <option value="HOT">HOT Tier</option>
          <option value="WARM">WARM Tier</option>
          <option value="COLD">COLD Tier</option>
        </select>
      </div>

      {/* Selection Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={selectAll}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {selectedIds.size === contacts.length && contacts.length > 0 
              ? 'Deselect All' 
              : 'Select All'}
          </button>
          <span className="text-sm text-slate-500">
            {selectedIds.size} of {totalContacts} selected
          </span>
        </div>
        <button
          onClick={handleEnroll}
          disabled={selectedIds.size === 0 || enrollMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enrollMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Enrolling...
            </>
          ) : (
            <>
              <Upload size={16} />
              Enroll {selectedIds.size} Contact{selectedIds.size !== 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>

      {/* Contacts Table */}
      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        {loadingContacts ? (
          <div className="p-12 text-center">
            <Loader2 size={32} className="mx-auto animate-spin text-blue-400 mb-4" />
            <p className="text-slate-400">Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={48} className="mx-auto text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No contacts found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onChange={selectAll}
                      className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Tier
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className={`hover:bg-slate-800/30 transition-colors cursor-pointer ${
                      selectedIds.has(contact.id) ? 'bg-blue-500/5' : ''
                    }`}
                    onClick={() => toggleSelect(contact.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">
                        {contact.firstName || contact.lastName 
                          ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                          : 'Unknown'}
                      </div>
                      {contact.email && (
                        <div className="text-xs text-slate-500">{contact.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300 font-mono">
                        {contact.phoneE164}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-300">
                        {contact.Property_Contact_propertyIdToProperty?.addressLine1 || '—'}
                      </div>
                      {contact.Property_Contact_propertyIdToProperty?.city && (
                        <div className="text-xs text-slate-500">
                          {contact.Property_Contact_propertyIdToProperty.city}, {contact.Property_Contact_propertyIdToProperty.state}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        contact.dm_tier === 'HOT' ? 'bg-rose-500/20 text-rose-400' :
                        contact.dm_tier === 'WARM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {contact.dm_tier || 'COLD'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PageFooterRail />
    </div>
  );
}
