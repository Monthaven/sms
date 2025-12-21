"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type SearchResult = {
  id: string;
  leadId: string;
  type: string;
  display: string;
  phone?: string;
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debounced) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
        const data = await res.json();
        setResults(data ?? []);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [debounced]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && e.target instanceof Node && overlayRef.current === e.target) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("click", onClickOutside);
    }
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((acc, item) => {
      acc[item.type] = acc[item.type] || [];
      acc[item.type].push(item);
      return acc;
    }, {});
  }, [results]);

  const goToResult = (leadId: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/dashboard/chat/${leadId}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 hover:border-sky-400/50 hover:bg-white/[0.06]"
      >
        <Search className="h-4 w-4 text-slate-400" />
        <span className="hidden sm:inline">Search (Cmd + K)</span>
        <span className="inline sm:hidden">Search</span>
      </button>

      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-6"
        >
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40">
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts, properties, messages..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4">
              {loading ? (
                <div className="text-xs text-slate-500">Searching…</div>
              ) : results.length === 0 ? (
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-slate-500">
                  No results found for &quot;{debounced}&quot;
                </div>
              ) : (
                Object.entries(grouped).map(([type, items]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">
                      {type}
                    </p>
                    <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/[0.02]">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => goToResult(item.leadId)}
                          className="w-full px-4 py-3 text-left transition hover:bg-white/[0.05]"
                        >
                          <div className="text-sm font-semibold text-white">
                            {item.display}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.type} {item.phone ? `• ${item.phone}` : ""}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
