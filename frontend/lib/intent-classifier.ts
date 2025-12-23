/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Intent classification for incoming messages.
 * Keywords-based classifier for HOT, WARM, NEUTRAL, NEGATIVE intent.
 */

export type IntentCategory = "HOT" | "WARM" | "NEUTRAL" | "NEGATIVE";

export interface IntentResult {
  intent: IntentCategory;
  confidence: number;
  matchedKeywords: string[];
  shouldBlock: boolean;
  shouldNotify: boolean;
}

// Hot keywords - high purchase intent
const HOT_KEYWORDS = [
  "interested",
  "sell",
  "selling",
  "offer",
  "price",
  "how much",
  "cash",
  "buyer",
  "deal",
  "yes",
  "let's talk",
  "call me",
  "available",
  "ready",
  "when can",
  "meet",
  "schedule",
  "appointment",
  "looking to",
  "want to sell",
  "make an offer",
  "serious buyer",
  "what's your offer",
  "consider selling",
];

// Warm keywords - mild interest
const WARM_KEYWORDS = [
  "maybe",
  "depends",
  "more info",
  "details",
  "tell me more",
  "what are you offering",
  "possibly",
  "thinking about",
  "not sure",
  "curious",
  "how does this work",
  "send info",
  "questions",
  "information",
  "brochure",
  "email me",
];

// Negative keywords - stop/block
const NEGATIVE_KEYWORDS = [
  "stop",
  "unsubscribe",
  "remove",
  "quit",
  "no more",
  "don't text",
  "don't contact",
  "leave me alone",
  "not interested",
  "no thanks",
  "no thank you",
  "wrong number",
  "harassment",
  "lawyer",
  "attorney",
  "sue",
  "report",
  "spam",
  "scam",
  "fuck off",
  "go away",
  "block",
  "never",
  "do not call",
  "dnc",
  "opt out",
  "optout",
  "cancel",
];

// Neutral - neither positive nor negative
const NEUTRAL_KEYWORDS = [
  "who is this",
  "who are you",
  "what company",
  "how did you get",
  "where did you",
  "what property",
  "which property",
  "?",
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function countKeywordMatches(text: string, keywords: string[]): { count: number; matched: string[] } {
  const normalized = normalizeText(text);
  const matched: string[] = [];
  
  for (const keyword of keywords) {
    if (normalized.includes(keyword.toLowerCase())) {
      matched.push(keyword);
    }
  }
  
  return { count: matched.length, matched };
}

export function classifyIntent(message: string): IntentResult {
  if (!message || message.trim().length === 0) {
    return {
      intent: "NEUTRAL",
      confidence: 0,
      matchedKeywords: [],
      shouldBlock: false,
      shouldNotify: false,
    };
  }

  const negativeMatches = countKeywordMatches(message, NEGATIVE_KEYWORDS);
  const hotMatches = countKeywordMatches(message, HOT_KEYWORDS);
  const warmMatches = countKeywordMatches(message, WARM_KEYWORDS);
  const neutralMatches = countKeywordMatches(message, NEUTRAL_KEYWORDS);

  // Priority: NEGATIVE > HOT > WARM > NEUTRAL
  if (negativeMatches.count > 0) {
    // Check for strong opt-out signals
    const strongOptOut = ["stop", "unsubscribe", "remove", "opt out", "optout", "dnc", "do not call"];
    const hasStrongOptOut = strongOptOut.some((kw) => message.toLowerCase().includes(kw));
    
    return {
      intent: "NEGATIVE",
      confidence: Math.min(1, negativeMatches.count * 0.4),
      matchedKeywords: negativeMatches.matched,
      shouldBlock: hasStrongOptOut,
      shouldNotify: false,
    };
  }

  if (hotMatches.count >= 1) {
    return {
      intent: "HOT",
      confidence: Math.min(1, hotMatches.count * 0.3),
      matchedKeywords: hotMatches.matched,
      shouldBlock: false,
      shouldNotify: true,
    };
  }

  if (warmMatches.count >= 1) {
    return {
      intent: "WARM",
      confidence: Math.min(1, warmMatches.count * 0.25),
      matchedKeywords: warmMatches.matched,
      shouldBlock: false,
      shouldNotify: false,
    };
  }

  return {
    intent: "NEUTRAL",
    confidence: neutralMatches.count > 0 ? 0.5 : 0.2,
    matchedKeywords: neutralMatches.matched,
    shouldBlock: false,
    shouldNotify: false,
  };
}

/**
 * Check if a message should trigger auto-block
 */
export function shouldAutoBlock(message: string): boolean {
  const result = classifyIntent(message);
  return result.shouldBlock;
}

/**
 * Check if a message should trigger a notification
 */
export function shouldNotifyHotLead(message: string): boolean {
  const result = classifyIntent(message);
  return result.shouldNotify;
}
