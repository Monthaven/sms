/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 * 
 * Real-time Provider - SSE connection and toast notifications
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ToastProvider';
import { 
  MessageSquare, 
  Phone, 
  PhoneIncoming, 
  PhoneMissed,
  UserPlus, 
  AlertTriangle,
  Bell,
  TrendingUp,
} from 'lucide-react';

// Event types from the server
export interface RealtimeEvent {
  type: 
    | 'connected'
    | 'new_message'
    | 'newMessage'
    | 'call_incoming'
    | 'call_ended'
    | 'call_missed'
    | 'lead_assigned'
    | 'lead_updated'
    | 'lead_hot'
    | 'system_alert'
    | 'automation_triggered';
  timestamp: number;
  data?: {
    id?: string;
    title?: string;
    message?: string;
    contactName?: string;
    contactId?: string;
    leadId?: string;
    from?: string;
    body?: string;
    [key: string]: unknown;
  };
}

interface RealtimeContextValue {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
  subscribe: (callback: (event: RealtimeEvent) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function RealtimeProvider({ children, userId }: RealtimeProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const subscribersRef = useRef<Set<(event: RealtimeEvent) => void>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();

  const subscribe = useCallback((callback: (event: RealtimeEvent) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const notifySubscribers = useCallback((event: RealtimeEvent) => {
    subscribersRef.current.forEach((callback) => {
      try {
        callback(event);
      } catch (err) {
        console.error('Subscriber callback error:', err);
      }
    });
  }, []);

  const showToastForEvent = useCallback((event: RealtimeEvent) => {
    const { type, data } = event;

    switch (type) {
      case 'new_message':
      case 'newMessage':
        addToast({
          type: 'info',
          title: 'New Message',
          message: data?.contactName 
            ? `${data.contactName}: ${(data.body || data.message || '').slice(0, 50)}...`
            : data?.body || data?.message || 'You have a new message',
          icon: <MessageSquare size={18} />,
          duration: 5000,
        });
        break;

      case 'call_incoming':
        addToast({
          type: 'warning',
          title: 'Incoming Call',
          message: data?.contactName || data?.from || 'Unknown caller',
          icon: <PhoneIncoming size={18} />,
          duration: 10000,
        });
        break;

      case 'call_missed':
        addToast({
          type: 'error',
          title: 'Missed Call',
          message: data?.contactName || data?.from || 'Unknown caller',
          icon: <PhoneMissed size={18} />,
          duration: 8000,
        });
        break;

      case 'lead_assigned':
        addToast({
          type: 'success',
          title: 'Lead Assigned',
          message: data?.message || 'A new lead has been assigned to you',
          icon: <UserPlus size={18} />,
          duration: 5000,
        });
        break;

      case 'lead_hot':
        addToast({
          type: 'success',
          title: '🔥 Hot Lead!',
          message: data?.contactName || 'A lead just became hot',
          icon: <TrendingUp size={18} />,
          duration: 8000,
        });
        break;

      case 'system_alert':
        addToast({
          type: 'warning',
          title: data?.title || 'System Alert',
          message: data?.message || 'Check the dashboard for details',
          icon: <AlertTriangle size={18} />,
          duration: 10000,
        });
        break;

      case 'automation_triggered':
        addToast({
          type: 'info',
          title: 'Automation Triggered',
          message: data?.message || 'An automation has been executed',
          icon: <Bell size={18} />,
          duration: 4000,
        });
        break;

      // Don't show toast for connection events
      case 'connected':
      default:
        break;
    }
  }, [addToast]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = userId 
      ? `/api/sse/agent-events?userId=${encodeURIComponent(userId)}`
      : '/api/sse/agent-events';

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log('[Realtime] SSE connection opened');
    };

    eventSource.onmessage = (e) => {
      try {
        const event: RealtimeEvent = JSON.parse(e.data);
        setLastEvent(event);
        notifySubscribers(event);
        
        // Show toast for relevant events
        if (event.type !== 'connected') {
          showToastForEvent(event);
        }
      } catch (err) {
        console.error('[Realtime] Failed to parse event:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();
      
      // Reconnect after 5 seconds
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('[Realtime] Attempting reconnection...');
        connect();
      }, 5000);
    };
  }, [userId, notifySubscribers, showToastForEvent]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return (
    <RealtimeContext.Provider value={{ isConnected, lastEvent, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}

// Connection status indicator component
export function ConnectionStatus() {
  const { isConnected } = useRealtime();

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-slate-500'}`} />
      <span className={isConnected ? 'text-emerald-400' : 'text-slate-500'}>
        {isConnected ? 'Live' : 'Connecting...'}
      </span>
    </div>
  );
}
