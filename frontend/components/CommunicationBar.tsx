/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { useState, useTransition } from "react";
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Voicemail, 
  ChevronDown,
  Send,
  Loader2,
  PhoneCall,
  MessageCircle,
} from "lucide-react";
import clsx from "clsx";
import CallOutcomeModal from "@/components/CallOutcomeModal";

type CommunicationBarProps = {
  leadId: string;
  phoneNumber: string;
  email?: string | null;
  leadName: string;
};

type SMSProvider = "twilio" | "eztexting";

export default function CommunicationBar({ 
  leadId, 
  phoneNumber, 
  email, 
  leadName,
}: CommunicationBarProps) {
  const [showSMSPanel, setShowSMSPanel] = useState(false);
  const [showEmailPanel, setShowEmailPanel] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [smsProvider, setSmsProvider] = useState<SMSProvider>("twilio");
  const [message, setMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [pending, startTransition] = useTransition();

  function handleCall() {
    // Direct call via tel: protocol
    window.location.href = `tel:${phoneNumber}`;
  }

  function handleSendSMS() {
    if (!message.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          to: phoneNumber,
          message: message.trim(),
          provider: smsProvider,
        }),
      });
      if (res.ok) {
        setMessage("");
        setShowSMSPanel(false);
      }
    });
  }

  function handleSendEmail() {
    if (!email || !emailSubject.trim() || !emailBody.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          to: email,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        }),
      });
      if (res.ok) {
        setEmailSubject("");
        setEmailBody("");
        setShowEmailPanel(false);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-2">
        {/* Call Button - Primary Action */}
        <a
          href={`tel:${phoneNumber}`}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-all"
        >
          <Phone className="h-4 w-4" />
          Call Now
        </a>

        {/* Log Call Button */}
        <button
          type="button"
          onClick={() => setShowCallLogModal(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all"
        >
          <PhoneCall className="h-4 w-4 text-amber-400" />
          Log Call
        </button>
        <CallOutcomeModal
          open={showCallLogModal}
          leadId={leadId}
          leadName={leadName}
          onClose={() => setShowCallLogModal(false)}
        />

        {/* Voicemail Button */}
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/5 transition-all"
        >
          <Voicemail className="h-4 w-4 text-purple-400" />
          Voicemail
        </button>

        {/* SMS Button */}
        <button
          type="button"
          onClick={() => { setShowSMSPanel(!showSMSPanel); setShowEmailPanel(false); }}
          className={clsx(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
            showSMSPanel 
              ? "border-sky-500/40 bg-sky-500/20 text-sky-300" 
              : "border-white/15 text-slate-300 hover:bg-white/5"
          )}
        >
          <MessageSquare className="h-4 w-4 text-sky-400" />
          Text
          <ChevronDown className={clsx("h-3 w-3 transition-transform", showSMSPanel && "rotate-180")} />
        </button>

        {/* Email Button */}
        {email && (
          <button
            type="button"
            onClick={() => { setShowEmailPanel(!showEmailPanel); setShowSMSPanel(false); }}
            className={clsx(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
              showEmailPanel 
                ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300" 
                : "border-white/15 text-slate-300 hover:bg-white/5"
            )}
          >
            <Mail className="h-4 w-4 text-indigo-400" />
            Email
          </button>
        )}
      </div>

      {/* SMS Compose Panel */}
      {showSMSPanel && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-sky-300">
              <MessageCircle className="h-4 w-4" />
              <span>Send SMS to {phoneNumber}</span>
            </div>
            {/* Provider Toggle */}
            <div className="flex rounded-lg border border-white/10 overflow-hidden text-xs">
              <button
                onClick={() => setSmsProvider("twilio")}
                className={clsx(
                  "px-3 py-1 transition",
                  smsProvider === "twilio" 
                    ? "bg-sky-500/30 text-sky-300" 
                    : "text-slate-400 hover:bg-white/5"
                )}
              >
                Twilio
              </button>
              <button
                onClick={() => setSmsProvider("eztexting")}
                className={clsx(
                  "px-3 py-1 transition",
                  smsProvider === "eztexting" 
                    ? "bg-emerald-500/30 text-emerald-300" 
                    : "text-slate-400 hover:bg-white/5"
                )}
              >
                EzTexting
              </button>
            </div>
          </div>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none resize-none"
            rows={3}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{message.length}/160 chars</span>
            <button
              onClick={handleSendSMS}
              disabled={pending || !message.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-500/20 border border-sky-500/40 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send via {smsProvider === "twilio" ? "Twilio" : "EzTexting"}
            </button>
          </div>
        </div>
      )}

      {/* Email Compose Panel */}
      {showEmailPanel && email && (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <Mail className="h-4 w-4" />
            <span>Email to {email}</span>
          </div>
          
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Subject..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
          />
          
          <textarea
            value={emailBody}
            onChange={(e) => setEmailBody(e.target.value)}
            placeholder="Write your email..."
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none resize-none"
            rows={4}
          />
          
          <div className="flex justify-end">
            <button
              onClick={handleSendEmail}
              disabled={pending || !emailSubject.trim() || !emailBody.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/20 border border-indigo-500/40 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Email
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
