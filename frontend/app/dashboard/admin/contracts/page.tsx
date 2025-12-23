/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  FileSignature,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Send,
  RefreshCw,
  FileText,
  User,
  Calendar,
} from "lucide-react";

type ContractStatus = "PENDING" | "SENT" | "VIEWED" | "SIGNED" | "DECLINED" | "EXPIRED";

type Contract = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: ContractStatus;
  envelopeId: string | null;
  sentAt: string | null;
  signedAt: string | null;
  expiresAt: string | null;
};

const statusConfig: Record<ContractStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pending", color: "slate", icon: Clock },
  SENT: { label: "Sent", color: "blue", icon: Send },
  VIEWED: { label: "Viewed", color: "amber", icon: Eye },
  SIGNED: { label: "Signed", color: "green", icon: CheckCircle },
  DECLINED: { label: "Declined", color: "red", icon: AlertCircle },
  EXPIRED: { label: "Expired", color: "gray", icon: Clock },
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const fetchContracts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/contracts");
      if (!res.ok) throw new Error("Failed to fetch contracts");
      const data = await res.json();
      setContracts(data.contracts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const sendContract = async (userId: string) => {
    setSending(userId);
    try {
      const res = await fetch("/api/admin/contracts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to send contract");
      await fetchContracts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send contract");
    } finally {
      setSending(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const signedCount = contracts.filter((c) => c.status === "SIGNED").length;
  const pendingCount = contracts.filter((c) => ["PENDING", "SENT", "VIEWED"].includes(c.status)).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileSignature className="text-blue-400" />
              Contractor Agreements
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage NDA and contractor agreements via DocuSign
            </p>
          </div>
          <button
            onClick={fetchContracts}
            disabled={isLoading}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200",
              "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
          >
            <RefreshCw size={14} className={clsx(isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{contracts.length}</div>
            <div className="text-sm text-slate-400">Total Contracts</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="text-2xl font-bold text-green-400">{signedCount}</div>
            <div className="text-sm text-slate-400">Signed</div>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20">
            <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
            <div className="text-sm text-slate-400">Pending</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="glass-panel rounded-xl p-4 border-red-500/30 bg-red-500/10">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </p>
        </div>
      )}

      {/* Contracts Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Sent
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Signed
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading && contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                  Loading contracts...
                </td>
              </tr>
            ) : contracts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  No contracts found. Add users to see their contract status.
                </td>
              </tr>
            ) : (
              contracts.map((contract) => {
                const config = statusConfig[contract.status];
                const StatusIcon = config.icon;
                return (
                  <tr key={contract.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                          <User size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{contract.userName}</div>
                          <div className="text-sm text-slate-400">{contract.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg",
                          contract.status === "SIGNED" && "bg-green-500/20 text-green-400",
                          contract.status === "PENDING" && "bg-slate-500/20 text-slate-400",
                          contract.status === "SENT" && "bg-blue-500/20 text-blue-400",
                          contract.status === "VIEWED" && "bg-amber-500/20 text-amber-400",
                          contract.status === "DECLINED" && "bg-red-500/20 text-red-400",
                          contract.status === "EXPIRED" && "bg-gray-500/20 text-gray-400"
                        )}
                      >
                        <StatusIcon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(contract.sentAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {formatDate(contract.signedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {contract.status === "PENDING" && (
                        <button
                          onClick={() => sendContract(contract.userId)}
                          disabled={sending === contract.userId}
                          className={clsx(
                            "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200",
                            "bg-blue-500/10 border border-blue-500/30 text-blue-400",
                            "hover:bg-blue-500/20 hover:border-blue-500/50",
                            sending === contract.userId && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Send size={14} />
                          {sending === contract.userId ? "Sending..." : "Send"}
                        </button>
                      )}
                      {contract.status === "SIGNED" && (
                        <button
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      )}
                      {["DECLINED", "EXPIRED"].includes(contract.status) && (
                        <button
                          onClick={() => sendContract(contract.userId)}
                          disabled={sending === contract.userId}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all duration-200"
                        >
                          <RefreshCw size={14} />
                          Resend
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
