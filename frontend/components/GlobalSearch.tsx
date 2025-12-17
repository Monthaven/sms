"use client";
import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data } = useSWR(open && debounced.length > 0 ? `/api/search?q=${encodeURIComponent(debounced)}` : null, fetcher);

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-2 py-1 rounded bg-white/2">Search</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
          <div className="w-full max-w-2xl rounded-lg bg-white/5 border border-white/10 p-4">
            <div className="flex items-center gap-3">
              <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1 bg-transparent outline-none p-2 text-white" placeholder={`Search...`} />
              <button onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="mt-3">
              {(!data || data.length === 0) ? (
                <div className="text-sm text-muted-foreground">No results found for &quot;{debounced}&quot;</div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.map((r: any) => (
                    <li key={r.id} className="p-2 hover:bg-white/3 cursor-pointer" onClick={() => { setOpen(false); router.push(`/dashboard/chat/${r.leadId}`); }}>
                      <div className="text-sm font-medium">{r.display}</div>
                      <div className="text-xs text-muted-foreground">{r.type} {r.phone ? `• ${r.phone}` : ''}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
