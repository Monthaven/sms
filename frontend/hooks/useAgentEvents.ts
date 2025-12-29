/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentEvent, EventType } from "@/lib/events";

interface UseAgentEventsOptions {
  userId?: string;
  onEvent?: (event: AgentEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

interface UseAgentEventsReturn {
  connected: boolean;
  lastEvent: AgentEvent | null;
  events: AgentEvent[];
  reconnect: () => void;
}

export function useAgentEvents(options: UseAgentEventsOptions = {}): UseAgentEventsReturn {
  const {
    userId,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AgentEvent | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;

  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Build SSE URL
    const url = `/api/sse/agent-events${userId ? `?userId=${userId}` : ""}`;

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AgentEvent;
          setLastEvent(data);
          setEvents((prev) => [data, ...prev.slice(0, 99)]); // Keep last 100 events
          onEvent?.(data);
        } catch (err) {
          console.error("Failed to parse SSE event:", err);
        }
      };

      eventSource.onerror = (error) => {
        setConnected(false);
        onError?.(error);
        onDisconnect?.();
        eventSource.close();

        // Auto-reconnect with exponential backoff
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            reconnectInterval * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          reconnectAttemptsRef.current++;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
    } catch (err) {
      console.error("Failed to create EventSource:", err);
    }
  }, [userId, onEvent, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

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

  return {
    connected,
    lastEvent,
    events,
    reconnect,
  };
}

// Specialized hooks for specific event types
export function useIncomingCalls(onIncomingCall: (event: AgentEvent) => void) {
  return useAgentEvents({
    onEvent: (event) => {
      if (event.type === "call_incoming") {
        onIncomingCall(event);
      }
    },
  });
}

export function useSmsNotifications(onSmsReceived: (event: AgentEvent) => void) {
  return useAgentEvents({
    onEvent: (event) => {
      if (event.type === "sms_received") {
        onSmsReceived(event);
      }
    },
  });
}

export function useQueueUpdates(onQueueUpdate: (event: AgentEvent) => void) {
  return useAgentEvents({
    onEvent: (event) => {
      if (event.type === "queue_update" || event.type === "lead_assigned" || event.type === "lead_claimed") {
        onQueueUpdate(event);
      }
    },
  });
}
