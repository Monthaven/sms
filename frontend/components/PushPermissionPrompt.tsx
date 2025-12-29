/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Push Permission Prompt - Request browser notification permissions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, X, Check, AlertTriangle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface PushPermissionPromptProps {
  /** Show as a modal overlay */
  asModal?: boolean;
  /** Called when permission changes */
  onPermissionChange?: (permission: PermissionState) => void;
  /** Custom message to display */
  message?: string;
}

// ============================================================================
// Hook for managing notification permissions
// ============================================================================

export function useNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission as PermissionState);
    } else {
      setPermission('unsupported');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result as PermissionState;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  const showTestNotification = useCallback(() => {
    if (permission !== 'granted') return;

    new Notification('Monthaven Acquisition Engine', {
      body: 'Notifications are enabled! You\'ll receive alerts for incoming calls and messages.',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
    });
  }, [permission]);

  return {
    permission,
    isSupported,
    requestPermission,
    showTestNotification,
  };
}

// ============================================================================
// Inline Banner Component
// ============================================================================

export function PushPermissionBanner({ 
  onPermissionChange,
  message = "Enable notifications to receive alerts for incoming calls, new messages, and hot leads."
}: PushPermissionPromptProps) {
  const { permission, isSupported, requestPermission, showTestNotification } = useNotificationPermission();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed before
    const stored = localStorage.getItem('mae-push-dismissed');
    if (stored) setDismissed(true);
  }, []);

  useEffect(() => {
    onPermissionChange?.(permission);
  }, [permission, onPermissionChange]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('mae-push-dismissed', 'true');
  };

  const handleRequest = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      showTestNotification();
    }
    onPermissionChange?.(result);
  };

  // Don't show if already granted, denied, not supported, or dismissed
  if (!isSupported || permission !== 'default' || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-1">Enable Push Notifications</h3>
          <p className="text-slate-300 text-sm">{message}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all text-sm"
          >
            Later
          </button>
          <button
            onClick={handleRequest}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all text-sm"
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Modal Component
// ============================================================================

export function PushPermissionModal({
  onPermissionChange,
  message = "Enable push notifications to receive instant alerts when customers call, leads become hot, or new messages arrive."
}: PushPermissionPromptProps) {
  const { permission, isSupported, requestPermission, showTestNotification } = useNotificationPermission();
  const [isOpen, setIsOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Show modal after a delay if permission not set and not shown before
    const hasShown = localStorage.getItem('mae-push-modal-shown');
    if (isSupported && permission === 'default' && !hasShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        localStorage.setItem('mae-push-modal-shown', 'true');
      }, 3000); // Show after 3 seconds
      return () => clearTimeout(timer);
    }
  }, [isSupported, permission]);

  const handleRequest = async () => {
    setRequesting(true);
    const result = await requestPermission();
    setRequesting(false);
    
    if (result === 'granted') {
      showTestNotification();
    }
    
    onPermissionChange?.(result);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Stay in the Loop</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-slate-300 text-center mb-6">{message}</p>

          {/* Benefits list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={14} className="text-emerald-400" />
              </div>
              <span>Instant alerts for incoming calls</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={14} className="text-emerald-400" />
              </div>
              <span>New message notifications</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Check size={14} className="text-emerald-400" />
              </div>
              <span>Hot lead alerts when scores spike</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition-all font-medium"
            >
              Not Now
            </button>
            <button
              onClick={handleRequest}
              disabled={requesting}
              className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {requesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Requesting...
                </>
              ) : (
                'Enable Notifications'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Settings Panel Component (for settings page)
// ============================================================================

export function NotificationSettings() {
  const { permission, isSupported, requestPermission, showTestNotification } = useNotificationPermission();

  if (!isSupported) {
    return (
      <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center">
            <BellOff size={24} className="text-slate-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Push Notifications</h3>
            <p className="text-slate-400 text-sm">
              Your browser doesn't support push notifications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleToggle = async () => {
    if (permission === 'default') {
      const result = await requestPermission();
      if (result === 'granted') {
        showTestNotification();
      }
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            permission === 'granted' 
              ? 'bg-emerald-500/20' 
              : permission === 'denied' 
              ? 'bg-red-500/20' 
              : 'bg-slate-700'
          }`}>
            {permission === 'granted' ? (
              <Bell size={24} className="text-emerald-400" />
            ) : permission === 'denied' ? (
              <BellOff size={24} className="text-red-400" />
            ) : (
              <Bell size={24} className="text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold">Push Notifications</h3>
            <p className="text-slate-400 text-sm">
              {permission === 'granted' && 'Notifications are enabled'}
              {permission === 'denied' && 'Notifications are blocked in browser settings'}
              {permission === 'default' && 'Enable notifications for real-time alerts'}
            </p>
          </div>
        </div>

        {permission === 'granted' && (
          <div className="flex items-center gap-3">
            <button
              onClick={showTestNotification}
              className="px-3 py-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-all text-sm"
            >
              Test
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-sm">
              <Check size={16} />
              Enabled
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm">
            <AlertTriangle size={16} />
            Blocked
          </div>
        )}

        {permission === 'default' && (
          <button
            onClick={handleToggle}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all text-sm"
          >
            Enable
          </button>
        )}
      </div>

      {permission === 'denied' && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <p className="font-medium mb-1">Notifications are blocked</p>
              <p className="text-amber-300/80">
                To enable notifications, click the lock icon in your browser's address bar 
                and change the notification setting to "Allow".
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Default Export - Auto-selects banner vs modal based on context
// ============================================================================

export default function PushPermissionPrompt({ asModal, ...props }: PushPermissionPromptProps) {
  if (asModal) {
    return <PushPermissionModal {...props} />;
  }
  return <PushPermissionBanner {...props} />;
}
