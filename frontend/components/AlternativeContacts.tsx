"use client";
import React from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Props = { propertyId: string; currentContactId?: string };

export default function AlternativeContacts({ propertyId, currentContactId }: Props) {
  const { data, error } = useSWR(propertyId ? `/api/properties/${propertyId}/contacts` : null, fetcher, { refreshInterval: 60000 });
  const router = useRouter();

  if (error) return <div className="text-sm text-red-400">Failed to load alternatives</div>;
  if (!data) return <div className="text-sm text-muted-foreground">Loading alternatives…</div>;

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <h4 className="text-sm font-semibold">Alternative Contacts</h4>
      <ul className="mt-2 space-y-2">
        {data.map((c: any, idx: number) => (
          <li key={c.id} className={`flex items-center justify-between p-2 rounded hover:bg-white/3 ${c.id === currentContactId ? 'ring-2 ring-primary' : ''}`}>
            <div>
              <div className="text-sm font-medium">{idx + 1}. {c.firstName} {c.lastName}</div>
              <div className="text-xs text-muted-foreground">{c.phoneE164} • {c.phoneType} • Score: {c.score ?? 'N/A'}</div>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => router.push(`/dashboard/chat/${c.leadId}`)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Call</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
