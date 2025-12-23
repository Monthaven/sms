/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import clsx from "clsx";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  User,
  MapPin,
  Building2,
  DollarSign,
  Clock,
  Calendar,
  Flame,
  Send,
  RefreshCw,
  PhoneCall,
  PhoneMissed,
  Voicemail,
  ThumbsDown,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  body: string;
  createdAt: string;
  status: string;
};

type CallLog = {
  id: string;
  duration: number;
  outcome: string | null;
  notes: string | null;
  createdAt: string;
  user: { name: string } | null;
};

type LeadDetail = {
  id: string;
  status: string;
  callbackAt: string | null;
  source: string | null;
  createdAt: string;
  contact: {
    id: string;
    name: string | null;
    phone: string | null;
    email: string | null;
    score: number;
    priority: string;
    intent: string | null;
  } | null;
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    units: number;
    value: number;
  } | null;
  messages: Message[];
  calls: CallLog[];
};

const outcomeIcons: Record<string, typeof Phone> = {
  HOT_LEAD: Flame,
  CALLBACK_REQUESTED: Calendar,
  LEFT_VOICEMAIL: Voicemail,
  NO_ANSWER: PhoneMissed,
  NOT_INTERESTED: ThumbsDown,
  WRONG_NUMBER: AlertCircle,
};

const outcomeColors: Record<string, string> = {
  HOT_LEAD: "text-orange-400 bg-orange-500/20",
  CALLBACK_REQUESTED: "text-amber-400 bg-amber-500/20",
  LEFT_VOICEMAIL: "text-blue-400 bg-blue-500/20",
  NO_ANSWER: "text-slate-400 bg-slate-500/20",
  NOT_INTERESTED: "text-red-400 bg-red-500/20",
  WRONG_NUMBER: "text-gray-400 bg-gray-500/20",
};

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = params.leadId as string;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const fetchLead = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      const data = await res.json();
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) fetchLead();
  }, [leadId, fetchLead]);

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: messageText }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setMessageText("");
      fetchLead();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Combine and sort timeline events
  const timeline: Array<{ type: "message" | "call"; data: Message | CallLog; date: Date }> =
    lead
      ? [
          ...lead.messages.map((m) => ({
            type: "message" as const,
            data: m,
            date: new Date(m.createdAt),
          })),
          ...lead.calls.map((c) => ({
            type: "call" as const,
            data: c,
            date: new Date(c.createdAt),
          })),
        ].sort((a, b) => b.date.getTime() - a.date.getTime())
      : [];

  if (isLoading && !lead) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw size={32} className="text-slate-500 animate-spin" />
      </div>
    );
  }

  if (error && !lead) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <p className="text-red-400">{error}</p>
        <Link
          href="/sms/queue"
          className="inline-flex items-center gap-2 mt-4 text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft size={16} />
          Back to Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/sms/queue"
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {lead?.contact?.name || "Unknown Contact"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">Lead #{leadId.slice(-8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/sms/dial/${leadId}`}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                "bg-green-500/10 border border-green-500/30 text-green-400",
                "hover:bg-green-500/20 hover:border-green-500/50"
              )}
            >
              <Phone size={16} />
              Call
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Contact & Property Info */}
        <div className="space-y-6">
          {/* Contact Card */}
          <div className="glass-panel rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Contact Info
            </h3>
            {lead?.contact && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-slate-500" />
                  <span className="text-white">{lead.contact.name || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-slate-500" />
                  <span className="text-slate-300 font-mono">
                    {lead.contact.phone || "No phone"}
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-500">Score</span>
                  <span className="text-white">{lead.contact.score}</span>
                  <span className="text-xs text-slate-500 ml-2">Priority</span>
                  <span
                    className={clsx(
                      "px-2 py-0.5 text-xs rounded",
                      lead.contact.priority === "HIGH" && "bg-red-500/20 text-red-400",
                      lead.contact.priority === "MEDIUM" && "bg-amber-500/20 text-amber-400",
                      lead.contact.priority === "LOW" && "bg-slate-500/20 text-slate-400"
                    )}
                  >
                    {lead.contact.priority}
                  </span>
                </div>
                {lead.contact.intent && (
                  <div className="flex items-center gap-2">
                    <Flame
                      size={16}
                      className={clsx(
                        lead.contact.intent === "HOT" && "text-red-400",
                        lead.contact.intent === "WARM" && "text-orange-400",
                        lead.contact.intent === "NEUTRAL" && "text-slate-400"
                      )}
                    />
                    <span className="text-sm text-slate-300">{lead.contact.intent} Intent</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Property Card */}
          {lead?.property && (
            <div className="glass-panel rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Property
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-slate-500 mt-0.5" />
                  <div>
                    <p className="text-white">{lead.property.address}</p>
                    <p className="text-sm text-slate-400">
                      {lead.property.city}, {lead.property.state} {lead.property.zip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-slate-500" />
                    <span className="text-sm text-slate-300">{lead.property.units} units</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-slate-500" />
                    <span className="text-sm text-slate-300">
                      {lead.property.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Callback */}
          {lead?.callbackAt && (
            <div className="glass-panel rounded-xl p-5 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <Calendar size={20} className="text-amber-400" />
                <div>
                  <p className="text-sm text-slate-400">Callback Scheduled</p>
                  <p className="text-white font-medium">
                    {new Date(lead.callbackAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Timeline */}
        <div className="col-span-2 glass-panel rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Conversation History</h3>

          {/* Message Input */}
          <div className="flex gap-3 mb-6 pb-6 border-b border-slate-800">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !messageText.trim()}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                "bg-blue-500 text-white hover:bg-blue-400",
                (sending || !messageText.trim()) && "opacity-50 cursor-not-allowed"
              )}
            >
              <Send size={16} />
              {sending ? "Sending..." : "Send"}
            </button>
          </div>

          {/* Timeline */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
            {timeline.length === 0 ? (
              <p className="text-center text-slate-400 py-8">
                No conversation history yet
              </p>
            ) : (
              timeline.map((item) => {
                if (item.type === "message") {
                  const msg = item.data as Message;
                  return (
                    <div
                      key={msg.id}
                      className={clsx(
                        "flex",
                        msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={clsx(
                          "max-w-[70%] rounded-xl px-4 py-3",
                          msg.direction === "OUTBOUND"
                            ? "bg-blue-500/20 text-blue-100"
                            : "bg-slate-800 text-slate-200"
                        )}
                      >
                        <p className="text-sm">{msg.body}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                } else {
                  const call = item.data as CallLog;
                  const OutcomeIcon = outcomeIcons[call.outcome || ""] || Phone;
                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg"
                    >
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          outcomeColors[call.outcome || ""] || "bg-slate-500/20 text-slate-400"
                        )}
                      >
                        <OutcomeIcon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {call.outcome?.replace(/_/g, " ") || "Call"}
                          </span>
                          <span className="text-sm text-slate-500">
                            {formatDuration(call.duration)}
                          </span>
                        </div>
                        {call.notes && (
                          <p className="text-sm text-slate-400 mt-1">{call.notes}</p>
                        )}
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDate(call.createdAt)}
                          {call.user && ` • ${call.user.name}`}
                        </p>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
