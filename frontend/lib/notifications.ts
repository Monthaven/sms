/**
 * Real-time Notifications Service
 * 
 * This module provides a stubbed interface for real-time notifications.
 * Production implementation should use Pusher, Ably, or Socket.io.
 * 
 * @example
 * // Subscribe to notifications
 * const unsubscribe = notifications.subscribe('user-123', (event) => {
 *   console.log('New notification:', event);
 * });
 * 
 * // Send a notification
 * await notifications.send('user-123', {
 *   type: 'new_lead',
 *   title: 'New Lead Assigned',
 *   message: 'John Doe from 123 Main St',
 *   data: { leadId: 'lead-456' }
 * });
 */

import { logger } from './logger';

// =============================================================================
// Types
// =============================================================================

export type NotificationType = 
  | 'new_lead'
  | 'new_message'
  | 'call_incoming'
  | 'call_ended'
  | 'lead_assigned'
  | 'lead_updated'
  | 'system_alert'
  | 'automation_triggered';

export interface NotificationEvent {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: Record<string, unknown>;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export type NotificationCallback = (event: NotificationEvent) => void;

// =============================================================================
// In-Memory Store (Development/Fallback)
// =============================================================================

const subscribers = new Map<string, Set<NotificationCallback>>();
const notificationHistory = new Map<string, NotificationEvent[]>();

// =============================================================================
// Stub Implementation
// =============================================================================

/**
 * Subscribe to real-time notifications for a user/channel
 * 
 * @stub In production, this should connect to Pusher/Ably/Socket.io
 */
export function subscribe(
  channel: string, 
  callback: NotificationCallback
): () => void {
  if (!subscribers.has(channel)) {
    subscribers.set(channel, new Set());
  }
  
  subscribers.get(channel)!.add(callback);
  
  logger.debug('Notification subscription added', { channel });
  
  // Return unsubscribe function
  return () => {
    const channelSubs = subscribers.get(channel);
    if (channelSubs) {
      channelSubs.delete(callback);
      if (channelSubs.size === 0) {
        subscribers.delete(channel);
      }
    }
    logger.debug('Notification subscription removed', { channel });
  };
}

/**
 * Send a notification to a channel
 * 
 * @stub In production, this should push to Pusher/Ably/Socket.io
 */
export async function send(
  channel: string, 
  payload: NotificationPayload
): Promise<NotificationEvent> {
  const event: NotificationEvent = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    timestamp: new Date(),
    read: false,
    data: payload.data,
  };
  
  // Store in history
  if (!notificationHistory.has(channel)) {
    notificationHistory.set(channel, []);
  }
  const history = notificationHistory.get(channel)!;
  history.unshift(event);
  
  // Keep only last 100 notifications per channel
  if (history.length > 100) {
    history.pop();
  }
  
  // Notify subscribers (in-memory)
  const channelSubs = subscribers.get(channel);
  if (channelSubs) {
    channelSubs.forEach(callback => {
      try {
        callback(event);
      } catch (err) {
        logger.error('Notification callback error', { channel }, err as Error);
      }
    });
  }
  
  logger.info('Notification sent', { 
    channel, 
    type: payload.type, 
    notificationId: event.id 
  });
  
  // TODO: In production, push to external service
  // await pusher.trigger(channel, 'notification', event);
  
  return event;
}

/**
 * Get notification history for a channel
 */
export function getHistory(channel: string, limit = 50): NotificationEvent[] {
  const history = notificationHistory.get(channel) || [];
  return history.slice(0, limit);
}

/**
 * Mark a notification as read
 */
export function markAsRead(channel: string, notificationId: string): boolean {
  const history = notificationHistory.get(channel);
  if (!history) return false;
  
  const notification = history.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    return true;
  }
  return false;
}

/**
 * Mark all notifications as read for a channel
 */
export function markAllAsRead(channel: string): number {
  const history = notificationHistory.get(channel);
  if (!history) return 0;
  
  let count = 0;
  history.forEach(n => {
    if (!n.read) {
      n.read = true;
      count++;
    }
  });
  return count;
}

/**
 * Get unread count for a channel
 */
export function getUnreadCount(channel: string): number {
  const history = notificationHistory.get(channel);
  if (!history) return 0;
  return history.filter(n => !n.read).length;
}

/**
 * Clear all notifications for a channel
 */
export function clear(channel: string): void {
  notificationHistory.delete(channel);
  logger.debug('Notifications cleared', { channel });
}

// =============================================================================
// Helper Functions for Common Notifications
// =============================================================================

export const notifications = {
  subscribe,
  send,
  getHistory,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clear,
  
  // Convenience methods for common notification types
  async newLead(userId: string, leadName: string, address: string, leadId: string) {
    return send(`user:${userId}`, {
      type: 'new_lead',
      title: 'New Lead Assigned',
      message: `${leadName} at ${address}`,
      data: { leadId }
    });
  },
  
  async newMessage(userId: string, from: string, preview: string, conversationId: string) {
    return send(`user:${userId}`, {
      type: 'new_message',
      title: `New message from ${from}`,
      message: preview.slice(0, 100),
      data: { conversationId }
    });
  },
  
  async incomingCall(userId: string, callerName: string, callSid: string) {
    return send(`user:${userId}`, {
      type: 'call_incoming',
      title: 'Incoming Call',
      message: `Call from ${callerName}`,
      data: { callSid }
    });
  },
  
  async systemAlert(userId: string, title: string, message: string) {
    return send(`user:${userId}`, {
      type: 'system_alert',
      title,
      message,
    });
  },
};

export default notifications;
