/**
 * PROPRIETARY — Always Improving LLC
 * DNC Management Page - Admin interface
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Search, 
  Plus, 
  Trash2, 
  Upload, 
  Download,
  Phone,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/Skeletons";

interface DncEntry {
  id: string;
  phone: string;
  source: string;
  reason: string | null;
  createdAt: string;
  addedBy?: { name: string };
}

export default function DncManagementPage() {
  const [entries, setEntries] = useState<DncEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newSource, setNewSource] = useState<string>("MANUAL");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      
      const res = await fetch(`/api/dnc?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      setEntries(data.entries);
      setTotalPages(data.pagination.pages);
    } catch (error) {
      console.error("Error fetching DNC:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleAdd() {
    if (!newPhone.trim()) return;
    
    setAdding(true);
    try {
      const res = await fetch("/api/dnc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone,
          source: newSource,
          reason: newReason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to add");
        return;
      }

      setShowAddModal(false);
      setNewPhone("");
      setNewReason("");
      fetchEntries();
    } catch (error) {
      console.error("Add error:", error);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this entry from DNC list?")) return;
    
    setDeleting(id);
    try {
      const res = await fetch(`/api/dnc?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchEntries();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleting(null);
    }
  }

  async function checkNumber() {
    if (!search.trim()) return;
    
    const res = await fetch(`/api/dnc/check?phone=${encodeURIComponent(search)}`);
    const data = await res.json();
    
    if (data.isBlocked) {
      alert(`Number ${search} is BLOCKED\n\nReason: ${data.reason || "On DNC list"}`);
    } else {
      alert(`Number ${search} is NOT on DNC list`);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">DNC Management</h1>
          <p className="text-gray-500">Do Not Contact list for compliance</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
        >
          <Plus className="w-5 h-5" />
          Add Number
        </button>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by phone number..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
          />
        </div>
        <button
          onClick={checkNumber}
          disabled={!search.trim()}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Check Number
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
        {loading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Phone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No DNC entries found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Source</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reason</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Added By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono">{entry.phone}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-1 text-xs rounded-full",
                      entry.source === "OPT_OUT" && "bg-yellow-100 text-yellow-800",
                      entry.source === "MANUAL" && "bg-blue-100 text-blue-800",
                      entry.source === "COMPLAINT" && "bg-red-100 text-red-800",
                      entry.source === "BOUNCED" && "bg-gray-100 text-gray-800",
                      entry.source === "CARRIER" && "bg-purple-100 text-purple-800",
                    )}>
                      {entry.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">
                    {entry.reason || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {entry.addedBy?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                    >
                      {deleting === entry.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add to DNC List</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Source</label>
                <select
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="MANUAL">Manual Entry</option>
                  <option value="OPT_OUT">Opt-Out Request</option>
                  <option value="COMPLAINT">Complaint</option>
                  <option value="BOUNCED">Bounced/Invalid</option>
                  <option value="CARRIER">Carrier Block</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <textarea
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Why this number is blocked..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 resize-none"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newPhone.trim()}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add to DNC"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
