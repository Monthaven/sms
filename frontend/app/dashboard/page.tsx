"use client";
import React, { useEffect, useState } from "react";
import { fetchLeads, Lead } from "@/lib/api";
import { MessageCircle } from "lucide-react";

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Fetch HOT and WARM leads for the Inbox
        // In a real app, use React Query here for better caching/polling
        const data = await fetchLeads();
        const activeLeads = data.filter((l) =>
          ["RESP_HOT", "RESP_WARM", "CONVERSATION_ACTIVE", "SENT"].includes(l.status)
        );
        setLeads(activeLeads);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <div className="p-10 text-slate-500">Loading Inbox...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">Inbox (Active Leads)</h1>

      <div className="bg-white shadow-sm rounded-lg border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-500">
                  No active leads found. Try importing a list!
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 py-0.5 inline-flex text-xs font-bold rounded-full ${
                        lead.status === "RESP_HOT"
                          ? "bg-green-100 text-green-800"
                          : lead.status === "RESP_WARM"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {lead.status.replace("RESP_", "")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {lead.contact.firstName} {lead.contact.lastName}
                    </div>
                    <div className="text-sm text-slate-500">{lead.contact.phoneE164}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{lead.property?.addressLine1 || "Unknown"}</div>
                    <div className="text-sm text-slate-500">{lead.property?.city}, {lead.property?.state}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    <button className="flex items-center px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors font-medium">
                      <MessageCircle className="w-4 h-4 mr-1.5" />
                      Chat
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
