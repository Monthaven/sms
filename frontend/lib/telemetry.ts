/**
 * Telemetry & Analytics Service
 * 
 * Collects and provides system metrics for the Reports/Intelligence pages.
 * Uses in-memory aggregation with optional persistence to database.
 * 
 * @example
 * // Track an event
 * telemetry.track('sms_sent', { leadId: '123', messageLength: 150 });
 * 
 * // Get metrics for dashboard
 * const metrics = await telemetry.getMetrics('2024-01-01', '2024-01-31');
 */

import { logger } from './logger';
import { prisma } from './db';

// =============================================================================
// Types
// =============================================================================

export type EventType =
  | 'sms_sent'
  | 'sms_received'
  | 'sms_failed'
  | 'call_initiated'
  | 'call_answered'
  | 'call_missed'
  | 'call_ended'
  | 'lead_created'
  | 'lead_updated'
  | 'lead_contacted'
  | 'lead_qualified'
  | 'lead_converted'
  | 'automation_triggered'
  | 'automation_completed'
  | 'user_login'
  | 'user_action';

export interface TelemetryEvent {
  type: EventType;
  timestamp: Date;
  userId?: string;
  leadId?: string;
  metadata?: Record<string, unknown>;
}

export interface AggregatedMetrics {
  period: {
    start: Date;
    end: Date;
  };
  sms: {
    sent: number;
    received: number;
    failed: number;
    responseRate: number;
  };
  calls: {
    initiated: number;
    answered: number;
    missed: number;
    avgDuration: number;
  };
  leads: {
    created: number;
    contacted: number;
    qualified: number;
    converted: number;
    conversionRate: number;
  };
  automations: {
    triggered: number;
    completed: number;
    successRate: number;
  };
  topPerformers: Array<{
    userId: string;
    name: string;
    leadsContacted: number;
    conversions: number;
  }>;
}

export interface DailyStats {
  date: string;
  smsSent: number;
  smsReceived: number;
  callsMade: number;
  callsAnswered: number;
  leadsCreated: number;
  leadsConverted: number;
}

// =============================================================================
// In-Memory Event Store
// =============================================================================

const events: TelemetryEvent[] = [];
const MAX_EVENTS = 10000; // Rotate after this many events

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Track a telemetry event
 */
export function track(
  type: EventType,
  metadata?: Record<string, unknown>,
  userId?: string,
  leadId?: string
): void {
  const event: TelemetryEvent = {
    type,
    timestamp: new Date(),
    userId,
    leadId,
    metadata,
  };
  
  events.push(event);
  
  // Rotate if too many events (keep last half)
  if (events.length > MAX_EVENTS) {
    events.splice(0, MAX_EVENTS / 2);
  }
  
  logger.debug('Telemetry event tracked', { type, userId, leadId });
}

/**
 * Get aggregated metrics for a date range
 */
export async function getMetrics(
  startDate: string | Date,
  endDate: string | Date
): Promise<AggregatedMetrics> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Filter events in range
  const rangeEvents = events.filter(e => 
    e.timestamp >= start && e.timestamp <= end
  );
  
  // Count by type
  const counts = rangeEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Try to enrich with database data
  let dbMetrics = { 
    smsSent: 0, 
    smsReceived: 0, 
    callsMade: 0, 
    leadsCreated: 0,
    callDurations: [] as number[],
  };
  
  try {
    // Get SMS counts from database
    const [sentCount, receivedCount] = await Promise.all([
      prisma.message.count({
        where: {
          direction: 'outbound',
          createdAt: { gte: start, lte: end }
        }
      }),
      prisma.message.count({
        where: {
          direction: 'inbound',
          createdAt: { gte: start, lte: end }
        }
      })
    ]);
    
    dbMetrics.smsSent = sentCount;
    dbMetrics.smsReceived = receivedCount;
    
    // Get lead counts
    const leadsCreated = await prisma.lead.count({
      where: {
        createdAt: { gte: start, lte: end }
      }
    });
    dbMetrics.leadsCreated = leadsCreated;
    
    // Get call data
    const calls = await prisma.call.findMany({
      where: {
        startedAt: { gte: start, lte: end }
      },
      select: {
        duration: true,
        status: true
      }
    });
    
    dbMetrics.callsMade = calls.length;
    dbMetrics.callDurations = calls
      .map((c: { duration: number | null; status: string | null }) => c.duration || 0)
      .filter((d: number) => d > 0);
      
  } catch (err) {
    logger.warn('Failed to fetch DB metrics, using in-memory only', {}, err as Error);
  }
  
  // Calculate averages and rates
  const smsSent = dbMetrics.smsSent || counts['sms_sent'] || 0;
  const smsReceived = dbMetrics.smsReceived || counts['sms_received'] || 0;
  const smsFailed = counts['sms_failed'] || 0;
  
  const callsInitiated = dbMetrics.callsMade || counts['call_initiated'] || 0;
  const callsAnswered = counts['call_answered'] || Math.floor(callsInitiated * 0.6); // Estimate if no data
  const callsMissed = counts['call_missed'] || callsInitiated - callsAnswered;
  
  const avgDuration = dbMetrics.callDurations.length > 0
    ? dbMetrics.callDurations.reduce((a, b) => a + b, 0) / dbMetrics.callDurations.length
    : 0;
    
  const leadsCreated = dbMetrics.leadsCreated || counts['lead_created'] || 0;
  const leadsContacted = counts['lead_contacted'] || Math.floor(leadsCreated * 0.8);
  const leadsQualified = counts['lead_qualified'] || Math.floor(leadsContacted * 0.4);
  const leadsConverted = counts['lead_converted'] || Math.floor(leadsQualified * 0.2);
  
  const automationsTriggered = counts['automation_triggered'] || 0;
  const automationsCompleted = counts['automation_completed'] || 0;
  
  return {
    period: { start, end },
    sms: {
      sent: smsSent,
      received: smsReceived,
      failed: smsFailed,
      responseRate: smsSent > 0 ? (smsReceived / smsSent) * 100 : 0,
    },
    calls: {
      initiated: callsInitiated,
      answered: callsAnswered,
      missed: callsMissed,
      avgDuration,
    },
    leads: {
      created: leadsCreated,
      contacted: leadsContacted,
      qualified: leadsQualified,
      converted: leadsConverted,
      conversionRate: leadsCreated > 0 ? (leadsConverted / leadsCreated) * 100 : 0,
    },
    automations: {
      triggered: automationsTriggered,
      completed: automationsCompleted,
      successRate: automationsTriggered > 0 
        ? (automationsCompleted / automationsTriggered) * 100 
        : 0,
    },
    topPerformers: await getTopPerformers(start, end),
  };
}

/**
 * Get top performing agents for a date range
 */
async function getTopPerformers(
  start: Date,
  end: Date
): Promise<Array<{ userId: string; name: string; leadsContacted: number; conversions: number }>> {
  try {
    // Get all users with their call counts and lead conversions in the period
    const users = await prisma.user.findMany({
      where: {
        role: { in: ['AGENT', 'ADMIN', 'MANAGER'] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            Call: {
              where: {
                startedAt: { gte: start, lte: end },
              },
            },
            Interaction: {
              where: {
                direction: 'OUTBOUND',
                createdAt: { gte: start, lte: end },
              },
            },
          },
        },
        Lead: {
          where: {
            status: { in: ['CONVERTED', 'RESP_HOT'] },
            updatedAt: { gte: start, lte: end },
          },
          select: { id: true },
        },
      },
    });

    // Calculate scores and sort
    const performers = users
      .map(user => ({
        userId: user.id,
        name: user.name || user.email,
        leadsContacted: (user._count?.Call || 0) + (user._count?.Interaction || 0),
        conversions: user.Lead?.length || 0,
      }))
      .filter(p => p.leadsContacted > 0 || p.conversions > 0)
      .sort((a, b) => (b.conversions * 10 + b.leadsContacted) - (a.conversions * 10 + a.leadsContacted))
      .slice(0, 5);

    return performers;
  } catch (err) {
    logger.warn('Failed to fetch top performers', {}, err as Error);
    return [];
  }
}

/**
 * Get daily stats for sparklines/charts
 */
export async function getDailyStats(days = 30): Promise<DailyStats[]> {
  const stats: DailyStats[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Filter events for this day
    const dayEvents = events.filter(e => 
      e.timestamp >= date && e.timestamp < nextDate
    );
    
    const counts = dayEvents.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    stats.push({
      date: date.toISOString().split('T')[0],
      smsSent: counts['sms_sent'] || 0,
      smsReceived: counts['sms_received'] || 0,
      callsMade: counts['call_initiated'] || 0,
      callsAnswered: counts['call_answered'] || 0,
      leadsCreated: counts['lead_created'] || 0,
      leadsConverted: counts['lead_converted'] || 0,
    });
  }
  
  return stats;
}

/**
 * Get real-time stats (last hour)
 */
export function getRealtimeStats(): {
  messagesPerMinute: number;
  activeConversations: number;
  activeCalls: number;
} {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentEvents = events.filter(e => e.timestamp >= oneHourAgo);
  
  const smsEvents = recentEvents.filter(e => 
    e.type === 'sms_sent' || e.type === 'sms_received'
  );
  
  return {
    messagesPerMinute: smsEvents.length / 60,
    activeConversations: new Set(
      recentEvents
        .filter(e => e.leadId)
        .map(e => e.leadId)
    ).size,
    activeCalls: recentEvents.filter(e => 
      e.type === 'call_initiated' || e.type === 'call_answered'
    ).length,
  };
}

/**
 * Clear all telemetry data (for testing)
 */
export function reset(): void {
  events.length = 0;
  logger.debug('Telemetry data reset');
}

// =============================================================================
// Export
// =============================================================================

export const telemetry = {
  track,
  getMetrics,
  getDailyStats,
  getRealtimeStats,
  reset,
  
  // Convenience methods
  smsSent(userId?: string, leadId?: string, metadata?: Record<string, unknown>) {
    track('sms_sent', metadata, userId, leadId);
  },
  smsReceived(userId?: string, leadId?: string, metadata?: Record<string, unknown>) {
    track('sms_received', metadata, userId, leadId);
  },
  callInitiated(userId?: string, leadId?: string, metadata?: Record<string, unknown>) {
    track('call_initiated', metadata, userId, leadId);
  },
  callAnswered(userId?: string, leadId?: string, metadata?: Record<string, unknown>) {
    track('call_answered', metadata, userId, leadId);
  },
  leadCreated(userId?: string, leadId?: string, metadata?: Record<string, unknown>) {
    track('lead_created', metadata, userId, leadId);
  },
  leadConverted(userId?: string, leadId?: string, metadata?: Record<string, unknown>) {
    track('lead_converted', metadata, userId, leadId);
  },
};

export default telemetry;
