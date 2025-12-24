/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DialPad } from "@/components/sms/DialPad";
import { Loader2, PhoneOff } from "lucide-react";

/**
 * Dialer page - auto-loads the next lead in queue or shows empty state
 */
export default function DialerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNextLead() {
      try {
        const res = await fetch("/api/sms/leads?limit=1&status=QUEUED");
        if (!res.ok) throw new Error("Failed to load leads");
        const data = await res.json();
        
        if (data.leads?.length > 0) {
          setLeadId(data.leads[0].id);
        } else {
          setError("No leads in queue");
        }
      } catch (err) {
        setError("Failed to load lead queue");
      } finally {
        setIsLoading(false);
      }
    }

    loadNextLead();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading dialer...</p>
        </div>
      </div>
    );
  }

  if (error || !leadId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center glass-panel rounded-xl p-8 max-w-sm">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
            <PhoneOff className="text-slate-500" size={28} />
          </div>
          <h3 className="text-white font-semibold mb-2">Queue Empty</h3>
          <p className="text-slate-400 text-sm mb-6">{error || "No leads available to dial"}</p>
          <button
            onClick={() => router.push("/sms/queue")}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
          >
            View Lead Queue
          </button>
        </div>
      </div>
    );
  }

  return <DialPad leadId={leadId} />;
}
