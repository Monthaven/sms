/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

interface LeadDetail {
  id: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  status: string;
  priority?: number;
  score?: number;
  lastContactedAt?: string;
  createdAt: string;
  notes?: string;
  intent?: string;
}

interface LeadDetailSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadDetail | null;
  onCall?: (lead: LeadDetail) => void;
  onSMS?: (lead: LeadDetail) => void;
}

export default function LeadDetailSlideOver({
  isOpen,
  onClose,
  lead,
  onCall,
  onSMS,
}: LeadDetailSlideOverProps) {
  if (!lead) return null;

  const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ") || "Unknown";
  const fullAddress = [
    lead.propertyAddress,
    lead.propertyCity,
    lead.propertyState,
    lead.propertyZip,
  ]
    .filter(Boolean)
    .join(", ");

  const statusColors: Record<string, string> = {
    NEW: "bg-blue-500/20 text-blue-400",
    CONTACTED: "bg-yellow-500/20 text-yellow-400",
    QUALIFIED: "bg-green-500/20 text-green-400",
    NOT_INTERESTED: "bg-red-500/20 text-red-400",
    CALLBACK: "bg-purple-500/20 text-purple-400",
    DNC: "bg-zinc-500/20 text-zinc-400",
  };

  const intentColors: Record<string, string> = {
    HIGH: "text-green-400",
    MEDIUM: "text-yellow-400",
    LOW: "text-red-400",
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Slide-over panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-zinc-900 shadow-xl">
                    {/* Header */}
                    <div className="border-b border-zinc-700 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-lg font-semibold text-white">
                          Lead Details
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-full p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                          onClick={onClose}
                          aria-label="Close lead details"
                          title="Close"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                      {/* Contact Info */}
                      <div className="mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
                            <UserIcon className="h-6 w-6 text-blue-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{fullName}</h3>
                            <p className="text-sm text-zinc-400">{lead.phone}</p>
                          </div>
                        </div>

                        {/* Status & Score */}
                        <div className="flex items-center gap-2 mb-4">
                          <span
                            className={clsx(
                              "px-2 py-1 rounded text-xs font-medium",
                              statusColors[lead.status] || "bg-zinc-700 text-zinc-300"
                            )}
                          >
                            {lead.status.replace("_", " ")}
                          </span>
                          {lead.score !== undefined && (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-zinc-700 text-zinc-300">
                              Score: {lead.score}
                            </span>
                          )}
                          {lead.intent && (
                            <span
                              className={clsx(
                                "px-2 py-1 rounded text-xs font-medium",
                                intentColors[lead.intent] || "text-zinc-400"
                              )}
                            >
                              {lead.intent} Intent
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Property Info */}
                      {fullAddress && (
                        <div className="mb-6 rounded-lg bg-zinc-800/50 p-4">
                          <div className="flex items-start gap-3">
                            <HomeIcon className="h-5 w-5 text-zinc-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-zinc-300">Property Address</p>
                              <p className="text-sm text-zinc-400">{fullAddress}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Timeline Info */}
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3 text-sm">
                          <CalendarIcon className="h-4 w-4 text-zinc-500" />
                          <span className="text-zinc-400">
                            Added:{" "}
                            {new Date(lead.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        {lead.lastContactedAt && (
                          <div className="flex items-center gap-3 text-sm">
                            <ClockIcon className="h-4 w-4 text-zinc-500" />
                            <span className="text-zinc-400">
                              Last Contact:{" "}
                              {new Date(lead.lastContactedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {lead.notes && (
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-zinc-300 mb-2">Notes</h4>
                          <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-3">
                            {lead.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="border-t border-zinc-700 p-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() => onCall?.(lead)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          <PhoneIcon className="h-5 w-5" />
                          Call
                        </button>
                        <button
                          onClick={() => onSMS?.(lead)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          <ChatBubbleLeftIcon className="h-5 w-5" />
                          SMS
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
