"use client";
import { useEffect, useState } from "react";
import { fetchLeads, Lead } from "@/lib/api";
import { Phone, CheckCircle } from "lucide-react";

export default function CallQueuePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // We need to update the API to allow filtering by QUEUED_FOR_CALL
        // For V1, fetch all and filter client-side is fine for small lists
        const data = await fetchLeads('QUEUED_FOR_CALL'); 
        setLeads(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-10">Loading Queue...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Call Queue (Landlines)</h1>
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className="px-6 py-4">{lead.contact.firstName} {lead.contact.lastName}</td>
                <td className="px-6 py-4">{lead.property?.addressLine1}</td>
                <td className="px-6 py-4 font-mono">{lead.contact.phoneE164}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 flex items-center gap-2 hover:underline">
                    <Phone size={16} /> Call
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}