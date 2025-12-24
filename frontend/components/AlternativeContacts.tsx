/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";
import React from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { Phone, MessageSquare, User } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneE164: string;
  phoneType?: string;
  score?: number;
  leadId?: string;
}

type Props = { propertyId: string; currentContactId?: string };

export default function AlternativeContacts({ propertyId, currentContactId }: Props) {
  const { data, error } = useSWR<Contact[]>(propertyId ? `/api/properties/${propertyId}/contacts` : null, fetcher, { refreshInterval: 60000 });
  const router = useRouter();

  if (error) return <div className="text-sm text-red-400">Failed to load alternatives</div>;
  if (!data) return <div className="text-sm text-slate-500">Loading alternatives…</div>;
  if (data.length === 0) return <div className="text-sm text-slate-500">No alternative contacts found</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-sky-400" />
        <h4 className="text-sm font-semibold text-white">Alternative Contacts</h4>
        <span className="text-[10px] text-slate-500 ml-auto">{data.length} found</span>
      </div>
      <ul className="space-y-2">
        {data.map((c: Contact, idx: number) => (
          <li 
            key={c.id} 
            className={`rounded-lg border p-2 ${
              c.id === currentContactId 
                ? 'border-sky-500/40 bg-sky-500/10' 
                : 'border-white/10 bg-white/5 hover:bg-white/8'
            } transition`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white truncate">
                  {idx + 1}. {c.firstName || ''} {c.lastName || 'Unknown'}
                  {c.id === currentContactId && (
                    <span className="ml-2 text-[10px] text-sky-400">(Current)</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 truncate">
                  {c.phoneE164} • {c.phoneType || 'Unknown'} • Score: {c.score ?? 'N/A'}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Call button - actual tel: link */}
                <a
                  href={`tel:${c.phoneE164}`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition"
                  title="Call this contact"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
                {/* View/Chat button */}
                {c.leadId && (
                  <button
                    onClick={() => router.push(`/dashboard/chat/${c.leadId}`)}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 transition"
                    title="View this lead"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
