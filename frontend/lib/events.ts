/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

/**
 * Real-time event system using Server-Sent Events
 * Provides pub/sub pattern for agent events
 */

// Event types
export type EventType =
  | "call_incoming"
  | "call_ended"
  | "call_answered"
  | "call_transferred"
  | "sms_received"
  | "sms_sent"
  | "sms_delivered"
  | "sms_failed"
  | "voicemail"
  | "lead_assigned"
  | "lead_claimed"
  | "lead_released"
  | "callback_due"
  | "notification"
  | "queue_update"
  | "status_change"
  | "agent_online"
  | "agent_offline"
  | "manager_monitor"
  | "heartbeat";

export interface AgentEvent {
  type: EventType;
  payload: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

type EventCallback = (event: AgentEvent) => void;

// In-memory subscriber store
const subscribers = new Map<string, Set<EventCallback>>();
const globalSubscribers = new Set<EventCallback>();

/**
 * Subscribe to events for a specific user
 */
export function subscribe(userId: string, callback: EventCallback): () => void {
  if (!subscribers.has(userId)) {
    subscribers.set(userId, new Set());
  }
  subscribers.get(userId)!.add(callback);

  // Return unsubscribe function
  return () => {
    const userSubs = subscribers.get(userId);
    if (userSubs) {
      userSubs.delete(callback);
      if (userSubs.size === 0) {
        subscribers.delete(userId);
      }
    }
  };
}

/**
 * Subscribe to all events (for admin/monitoring)
 */
export function subscribeGlobal(callback: EventCallback): () => void {
  globalSubscribers.add(callback);
  return () => {
    globalSubscribers.delete(callback);
  };
}

/**
 * Publish an event to a specific user
 */
export function publishEvent(userId: string, event: Omit<AgentEvent, "timestamp">): void {
  const fullEvent: AgentEvent = {
    ...event,
    userId,
    timestamp: Date.now(),
  };

  // Notify user-specific subscribers
  const userSubs = subscribers.get(userId);
  if (userSubs) {
    userSubs.forEach((callback) => {
      try {
        callback(fullEvent);
      } catch (err) {
        console.error("Event callback error:", err);
      }
    });
  }

  // Notify global subscribers
  globalSubscribers.forEach((callback) => {
    try {
      callback(fullEvent);
    } catch (err) {
      console.error("Global event callback error:", err);
    }
  });
}

/**
 * Broadcast an event to all subscribers
 */
export function broadcastEvent(event: Omit<AgentEvent, "timestamp" | "userId">): void {
  const fullEvent: AgentEvent = {
    ...event,
    timestamp: Date.now(),
  };

  // Notify all user subscribers
  subscribers.forEach((subs) => {
    subs.forEach((callback) => {
      try {
        callback(fullEvent);
      } catch (err) {
        console.error("Broadcast callback error:", err);
      }
    });
  });

  // Notify global subscribers
  globalSubscribers.forEach((callback) => {
    try {
      callback(fullEvent);
    } catch (err) {
      console.error("Global broadcast callback error:", err);
    }
  });
}

/**
 * Publish multiple events to a user
 */
export function publishEvents(userId: string, events: Omit<AgentEvent, "timestamp">[]): void {
  events.forEach((event) => publishEvent(userId, event));
}

/**
 * Check if a user has active subscribers
 */
export function hasSubscribers(userId: string): boolean {
  const userSubs = subscribers.get(userId);
  return !!userSubs && userSubs.size > 0;
}

/**
 * Get count of active subscribers for a user
 */
export function getSubscriberCount(userId: string): number {
  return subscribers.get(userId)?.size || 0;
}

/**
 * Get total active connections
 */
export function getTotalConnections(): number {
  let total = 0;
  subscribers.forEach((subs) => {
    total += subs.size;
  });
  return total + globalSubscribers.size;
}

/**
 * Clear all subscribers (for testing)
 */
export function clearAllSubscribers(): void {
  subscribers.clear();
  globalSubscribers.clear();
}

// Pre-built event creators
export const events = {
  callIncoming: (data: { callSid: string; from: string; to: string; contactId?: string; leadId?: string }) => ({
    type: "call_incoming" as EventType,
    payload: data,
  }),

  callEnded: (data: { callSid: string; duration?: number; disposition?: string }) => ({
    type: "call_ended" as EventType,
    payload: data,
  }),

  callAnswered: (data: { callSid: string }) => ({
    type: "call_answered" as EventType,
    payload: data,
  }),

  smsReceived: (data: { messageSid: string; from: string; body: string; contactId?: string }) => ({
    type: "sms_received" as EventType,
    payload: data,
  }),

  voicemail: (data: { callSid: string; recordingUrl: string; transcription?: string }) => ({
    type: "voicemail" as EventType,
    payload: data,
  }),

  leadAssigned: (data: { leadId: string; contactName?: string }) => ({
    type: "lead_assigned" as EventType,
    payload: data,
  }),

  leadClaimed: (data: { leadId: string; claimedBy: string }) => ({
    type: "lead_claimed" as EventType,
    payload: data,
  }),

  callbackDue: (data: { leadId: string; contactName?: string; phone: string; scheduledAt: string }) => ({
    type: "callback_due" as EventType,
    payload: data,
  }),

  notification: (data: { id: string; type: string; title: string; body?: string; actionUrl?: string }) => ({
    type: "notification" as EventType,
    payload: data,
  }),

  queueUpdate: (data: { available: number; pending: number }) => ({
    type: "queue_update" as EventType,
    payload: data,
  }),

  heartbeat: () => ({
    type: "heartbeat" as EventType,
    payload: { time: Date.now() },
  }),
};
