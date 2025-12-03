// Simple Human Response Classification
import { normalizeString } from "./normalize.js";

/**
 * Classify responses into simple human categories
 * No over-engineering, just practical triage
 */
export function classifyHumanResponse(message) {
  const msg = normalizeString(message).toLowerCase();
  
  if (!msg) {
    return {
      priority: 'UNKNOWN',
      action: 'REVIEW',
      sla: 'manual',
      confidence: 0
    };
  }

  // 🔥 HOT - Call immediately (within 1 hour)
  const hotPatterns = [
    /\b(yes|yeah|yep|interested|call|tell me more)\b/,
    /\b(what.*offer|how much|price|value)\b/,
    /\b(sure|sounds good|let.* talk)\b/
  ];
  
  if (hotPatterns.some(pattern => pattern.test(msg))) {
    return {
      priority: 'HOT',
      action: 'CALL_NOW', 
      sla: '1 hour',
      confidence: 0.9,
      suggestedResponse: 'Call immediately - they showed interest'
    };
  }

  // 🟡 WARM - Follow up soon (within 4 hours)
  const warmPatterns = [
    /\b(maybe|might|depends|thinking|considering)\b/,
    /\b(what.*thinking|tell me about|more info)\b/,
    /\b(possibly|potentially|could be)\b/
  ];
  
  if (warmPatterns.some(pattern => pattern.test(msg))) {
    return {
      priority: 'WARM',
      action: 'CALL_SOON',
      sla: '4 hours', 
      confidence: 0.8,
      suggestedResponse: 'Call within 4 hours or send follow-up text'
    };
  }

  // 🚫 OPT OUT - Immediate suppression
  const optOutPatterns = [
    /\b(stop|unsubscribe|remove|no|not interested)\b/,
    /\b(don.* contact|leave.*alone|quit)\b/,
    /\b(never|already sold|not selling)\b/
  ];
  
  if (optOutPatterns.some(pattern => pattern.test(msg))) {
    return {
      priority: 'OPT_OUT',
      action: 'SUPPRESS',
      sla: 'immediate',
      confidence: 0.95,
      suggestedResponse: 'Add to suppression list immediately'
    };
  }

  // ❄️ COLD - System follow-up (automated sequence)
  return {
    priority: 'COLD',
    action: 'FOLLOW_UP',
    sla: '3 days',
    confidence: 0.6,
    suggestedResponse: 'Add to automated follow-up sequence'
  };
}

/**
 * Simple follow-up sequence timing
 */
export function getFollowUpSchedule(initialContactDate) {
  const schedules = {
    day3: new Date(initialContactDate.getTime() + (3 * 24 * 60 * 60 * 1000)),
    day7: new Date(initialContactDate.getTime() + (7 * 24 * 60 * 60 * 1000)), 
    day30: new Date(initialContactDate.getTime() + (30 * 24 * 60 * 60 * 1000))
  };
  
  return schedules;
}

/**
 * Track delivery issues for data quality
 */
export function classifyDeliveryIssue(deliveryStatus, phoneNumber) {
  const status = (deliveryStatus || '').toLowerCase();
  const phone = normalizeString(phoneNumber);
  
  // Determine phone type for better tracking
  let phoneType = 'unknown';
  if (phone.match(/^(\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/)) {
    phoneType = 'mobile'; // Likely mobile number
  } else if (phone.match(/^(\+1)?[2-9]\d{2}[2-9][01]\d\d{4}$/)) {
    phoneType = 'landline'; // Likely landline (middle digit 0 or 1)
  }
  
  if (status.includes('delivered')) {
    return { 
      category: 'SUCCESS', 
      phoneType, 
      action: 'none',
      retryable: false 
    };
  }
  
  if (status.includes('bounced') || status.includes('failed')) {
    if (status.includes('invalid') || status.includes('disconnected')) {
      return { 
        category: 'HARD_BOUNCE', 
        phoneType,
        action: 'remove_from_list', 
        retryable: false 
      };
    } else {
      return { 
        category: 'SOFT_BOUNCE', 
        phoneType,
        action: 'retry_later', 
        retryable: true 
      };
    }
  }
  
  if (phoneType === 'landline') {
    return { 
      category: 'LANDLINE', 
      phoneType,
      action: 'remove_sms_add_call_list', 
      retryable: false 
    };
  }
  
  return { 
    category: 'UNKNOWN', 
    phoneType,
    action: 'monitor', 
    retryable: true 
  };
}

/**
 * Generate simple analytics for tracking
 */
export function calculateSimpleMetrics(responses, deliveries) {
  const total = responses.length;
  const hot = responses.filter(r => r.priority === 'HOT').length;
  const warm = responses.filter(r => r.priority === 'WARM').length;  
  const cold = responses.filter(r => r.priority === 'COLD').length;
  const optOut = responses.filter(r => r.priority === 'OPT_OUT').length;
  
  const delivered = deliveries.filter(d => d.category === 'SUCCESS').length;
  const bounced = deliveries.filter(d => d.category.includes('BOUNCE')).length;
  const landlines = deliveries.filter(d => d.category === 'LANDLINE').length;
  
  return {
    responseMetrics: {
      total,
      responseRate: total > 0 ? ((hot + warm + cold + optOut) / total * 100).toFixed(1) + '%' : '0%',
      hotRate: total > 0 ? (hot / total * 100).toFixed(1) + '%' : '0%',
      warmRate: total > 0 ? (warm / total * 100).toFixed(1) + '%' : '0%',
      optOutRate: total > 0 ? (optOut / total * 100).toFixed(1) + '%' : '0%'
    },
    deliveryMetrics: {
      total: deliveries.length,
      deliveryRate: deliveries.length > 0 ? (delivered / deliveries.length * 100).toFixed(1) + '%' : '0%',
      bounceRate: deliveries.length > 0 ? (bounced / deliveries.length * 100).toFixed(1) + '%' : '0%',
      landlineRate: deliveries.length > 0 ? (landlines / deliveries.length * 100).toFixed(1) + '%' : '0%'
    }
  };
}

/**
 * Practical priority queue for callers
 */
export function generateCallQueue(responses) {
  const now = new Date();
  const queue = {
    callNow: [],      // Hot leads - call within 1 hour
    callSoon: [],     // Warm leads - call within 4 hours  
    followUp: [],     // Cold leads - system handles
    optedOut: []      // For compliance tracking
  };
  
  responses.forEach(response => {
    const timeSinceResponse = now - new Date(response.timestamp);
    const hoursAgo = timeSinceResponse / (1000 * 60 * 60);
    
    const leadInfo = {
      phone: response.phone,
      address: response.address,
      message: response.message,
      timeAgo: hoursAgo < 1 ? `${Math.floor(timeSinceResponse / (1000 * 60))} min ago` : `${Math.floor(hoursAgo)} hrs ago`,
      priority: response.priority,
      suggestedAction: response.suggestedResponse
    };
    
    switch (response.priority) {
      case 'HOT':
        queue.callNow.push(leadInfo);
        break;
      case 'WARM':
        queue.callSoon.push(leadInfo);
        break;
      case 'COLD':
        queue.followUp.push(leadInfo);
        break;
      case 'OPT_OUT':
        queue.optedOut.push(leadInfo);
        break;
    }
  });
  
  // Sort by time (most recent first)
  queue.callNow.sort((a, b) => a.timeAgo.localeCompare(b.timeAgo));
  queue.callSoon.sort((a, b) => a.timeAgo.localeCompare(b.timeAgo));
  
  return queue;
}