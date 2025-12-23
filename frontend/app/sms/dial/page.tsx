/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DialPad } from "@/components/sms/DialPad";
import { Loader2 } from "lucide-react";

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center glass-panel rounded-xl p-8">
          <p className="text-slate-300 mb-4">{error}</p>
          <button
            onClick={() => router.push("/sms/queue")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Lead Queue
          </button>
        </div>
      </div>
    );
  }

  if (!leadId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center glass-panel rounded-xl p-8">
          <p className="text-slate-300 mb-4">No leads available to dial</p>
          <button
            onClick={() => router.push("/sms/queue")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Lead Queue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <DialPad leadId={leadId} />
    </div>
  );
}
