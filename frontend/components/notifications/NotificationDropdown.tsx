/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useState, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useClickOutside } from "@/hooks/useClickOutside";
import clsx from "clsx";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, dismiss, loading } =
    useNotifications();
  const dropdownRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={() => markAsRead(notification.id)}
                    onDismiss={() => dismiss(notification.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: {
    id: string;
    type: string;
    title: string;
    body?: string;
    actionUrl?: string;
    read: boolean;
    createdAt: string;
  };
  onMarkRead: () => void;
  onDismiss: () => void;
}

function NotificationItem({ notification, onMarkRead, onDismiss }: NotificationItemProps) {
  const typeColors: Record<string, string> = {
    CALL_INCOMING: "bg-green-500",
    CALL_MISSED: "bg-rose-500",
    VOICEMAIL: "bg-amber-500",
    SMS_RECEIVED: "bg-blue-500",
    CALLBACK_DUE: "bg-purple-500",
    LEAD_ASSIGNED: "bg-indigo-500",
    LEAD_HOT: "bg-orange-500",
    SYSTEM: "bg-slate-500",
  };

  const timeAgo = getTimeAgo(notification.createdAt);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead();
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <div
      className={clsx(
        "relative px-4 py-3 hover:bg-slate-800/50 transition-colors cursor-pointer group",
        !notification.read && "bg-slate-800/30"
      )}
      onClick={handleClick}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div
          className={clsx(
            "absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full",
            typeColors[notification.type] || "bg-indigo-500"
          )}
        />
      )}

      <div className="flex items-start gap-3 pl-2">
        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              "text-sm font-medium truncate",
              notification.read ? "text-slate-400" : "text-white"
            )}
          >
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notification.body}</p>
          )}
          <p className="text-[10px] text-slate-600 mt-1">{timeAgo}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300"
              title="Mark as read"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-slate-300"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default NotificationDropdown;
