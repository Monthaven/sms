/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

/**
 * Structured logging utility using console with JSON formatting
 * For production, can be easily swapped to Pino, Winston, or cloud logging
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  /** Correlation ID for request tracing */
  requestId?: string;
  /** User ID if authenticated */
  userId?: string;
  /** Additional structured data */
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Configurable minimum log level
const MIN_LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LOG_LEVEL];
}

function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    // JSON format for production (easier to parse in log aggregators)
    return JSON.stringify(entry);
  }
  
  // Human-readable format for development
  const levelColors: Record<LogLevel, string> = {
    debug: "\x1b[36m", // cyan
    info: "\x1b[32m",  // green
    warn: "\x1b[33m",  // yellow
    error: "\x1b[31m", // red
  };
  const reset = "\x1b[0m";
  const color = levelColors[entry.level];
  
  let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    output += ` ${JSON.stringify(entry.context)}`;
  }
  
  if (entry.error) {
    output += `\n  Error: ${entry.error.message}`;
    if (entry.error.stack) {
      output += `\n  ${entry.error.stack}`;
    }
  }
  
  return output;
}

function log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };

  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      code: (error as any).code,
    };
  }

  const formatted = formatLogEntry(entry);

  switch (level) {
    case "error":
      console.error(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "debug":
      console.debug(formatted);
      break;
    default:
      console.log(formatted);
  }
}

/**
 * Logger instance with convenience methods
 */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext, error?: Error) => log("warn", message, context, error),
  error: (message: string, context?: LogContext, error?: Error) => log("error", message, context, error),
  
  /**
   * Create a child logger with preset context
   */
  child: (baseContext: LogContext) => ({
    debug: (message: string, context?: LogContext) => 
      log("debug", message, { ...baseContext, ...context }),
    info: (message: string, context?: LogContext) => 
      log("info", message, { ...baseContext, ...context }),
    warn: (message: string, context?: LogContext, error?: Error) => 
      log("warn", message, { ...baseContext, ...context }, error),
    error: (message: string, context?: LogContext, error?: Error) => 
      log("error", message, { ...baseContext, ...context }, error),
  }),
};

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}
