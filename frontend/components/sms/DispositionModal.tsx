"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { dispositionSchema } from "@/lib/validations";
import clsx from "clsx";
import {
  PhoneMissed,
  Voicemail,
  ThumbsDown,
  Calendar,
  Flame,
  AlertCircle,
  X,
  Save,
  Clock,
} from "lucide-react";

type Outcome =
  | "NO_ANSWER"
  | "LEFT_VOICEMAIL"
  | "NOT_INTERESTED"
  | "CALLBACK_REQUESTED"
  | "HOT_LEAD"
  | "WRONG_NUMBER";

interface DispositionModalProps {
  open: boolean;
  leadId: string;
  callDuration?: number;
  onClose: () => void;
  onSaved?: () => void;
}

const outcomeOptions: { value: Outcome; label: string; description: string; icon: typeof PhoneMissed; color: string }[] = [
  { value: "NO_ANSWER", label: "No Answer", description: "No one picked up", icon: PhoneMissed, color: "slate" },
  { value: "LEFT_VOICEMAIL", label: "Left Voicemail", description: "Left a message", icon: Voicemail, color: "blue" },
  { value: "NOT_INTERESTED", label: "Not Interested", description: "Declined offer", icon: ThumbsDown, color: "red" },
  { value: "CALLBACK_REQUESTED", label: "Callback Requested", description: "Asked for follow-up", icon: Calendar, color: "amber" },
  { value: "HOT_LEAD", label: "Hot Lead", description: "Interested in selling", icon: Flame, color: "orange" },
  { value: "WRONG_NUMBER", label: "Wrong Number", description: "Not the right person", icon: AlertCircle, color: "gray" },
];

export function DispositionModal({ open, leadId, callDuration, onClose, onSaved }: DispositionModalProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setOutcome(null);
      setNotes("");
      setCallbackAt("");
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    setError(null);
    const payload = { outcome, notes, callbackAt: callbackAt || undefined };
    const parsed = dispositionSchema.safeParse(payload);
    if (!parsed.success) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/sms/leads/${leadId}/disposition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || "Failed to save disposition");
      }
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (s?: number) => {
    if (!s) return null;
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md rounded-2xl glass-panel p-6 shadow-2xl border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-white">Log Call Outcome</Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    title="Close dialog"
                    aria-label="Close dialog"
                  >
                    <X size={20} />
                  </button>
                </div>

                {callDuration !== undefined && (
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-4 bg-slate-800/50 rounded-lg px-3 py-2">
                    <Clock size={16} />
                    <span>Call duration: {formatDuration(callDuration)}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mb-4">
                  {outcomeOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = outcome === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setOutcome(opt.value)}
                        className={clsx(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center",
                          isSelected
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-slate-700 bg-slate-800/30 hover:border-slate-600 hover:bg-slate-800/50"
                        )}
                      >
                        <Icon
                          size={24}
                          className={clsx(
                            isSelected ? "text-blue-400" : "text-slate-500"
                          )}
                        />
                        <div>
                          <div className={clsx(
                            "font-medium text-sm",
                            isSelected ? "text-white" : "text-slate-300"
                          )}>
                            {opt.label}
                          </div>
                          <div className="text-xs text-slate-500">{opt.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {outcome === "CALLBACK_REQUESTED" && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-2">Schedule Callback</label>
                    <input
                      type="datetime-local"
                      value={callbackAt}
                      onChange={(e) => setCallbackAt(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      title="Select callback date and time"
                      aria-label="Callback date and time"
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none"
                    placeholder="What happened on the call?"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-400 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={loading || !outcome}
                    className={clsx(
                      "flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                      "bg-blue-500 text-white hover:bg-blue-400",
                      (loading || !outcome) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Save size={16} />
                    {loading ? "Saving..." : "Save Disposition"}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
