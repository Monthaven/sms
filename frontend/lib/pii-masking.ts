/**
 * PROPRIETARY — Always Improving LLC
 * PII Masking Utility - Redact sensitive data from logs
 */

// Patterns for sensitive data
const PII_PATTERNS = {
  // Phone numbers: +1234567890, (123) 456-7890, 123-456-7890, etc.
  phone: /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  
  // Social Security Numbers: 123-45-6789
  ssn: /\d{3}-\d{2}-\d{4}/g,
  
  // Credit card numbers: 4111111111111111, 4111-1111-1111-1111
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // IP addresses
  ip: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // Auth tokens (JWT-like patterns)
  jwt: /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  
  // API keys (common patterns)
  apiKey: /(?:sk|pk|api|key)[-_]?[a-zA-Z0-9]{20,}/gi,
  
  // Bearer tokens
  bearer: /Bearer\s+[a-zA-Z0-9._-]+/gi,
};

// Fields that commonly contain PII
const SENSITIVE_FIELDS = [
  "password",
  "secret",
  "token",
  "apiKey",
  "api_key",
  "authorization",
  "auth",
  "ssn",
  "socialSecurityNumber",
  "creditCard",
  "cardNumber",
  "cvv",
  "phone",
  "phoneNumber",
  "email",
  "address",
  "dob",
  "dateOfBirth",
  "firstName",
  "lastName",
  "fullName",
];

/**
 * Mask a string value based on its type
 */
function maskValue(value: string, type: string): string {
  switch (type) {
    case "phone":
      // Show last 4 digits: ***-***-1234
      return value.replace(/\d(?=\d{4})/g, "*");
    
    case "email":
      // Show first char and domain: j***@example.com
      const [local, domain] = value.split("@");
      return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
    
    case "creditCard":
      // Show last 4: ****-****-****-1234
      return value.replace(/\d(?=\d{4})/g, "*");
    
    case "ssn":
      return "***-**-" + value.slice(-4);
    
    case "jwt":
    case "apiKey":
    case "bearer":
      // Show first 6 and last 4
      if (value.length > 10) {
        return value.slice(0, 6) + "..." + value.slice(-4);
      }
      return "*".repeat(value.length);
    
    default:
      return "[REDACTED]";
  }
}

/**
 * Mask PII in a string
 */
export function maskString(input: string): string {
  let result = input;
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    result = result.replace(pattern, (match) => maskValue(match, type));
  }
  
  return result;
}

/**
 * Recursively mask PII in an object
 */
export function maskObject<T>(obj: T, depth = 0): T {
  // Prevent infinite recursion
  if (depth > 10) return obj;
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === "string") {
    return maskString(obj) as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => maskObject(item, depth + 1)) as T;
  }
  
  if (typeof obj === "object") {
    const masked: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Check if field name indicates sensitive data
      const isSensitiveField = SENSITIVE_FIELDS.some(
        field => key.toLowerCase().includes(field.toLowerCase())
      );
      
      if (isSensitiveField && typeof value === "string") {
        masked[key] = "[REDACTED]";
      } else if (typeof value === "object") {
        masked[key] = maskObject(value, depth + 1);
      } else if (typeof value === "string") {
        masked[key] = maskString(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked as T;
  }
  
  return obj;
}

/**
 * Create a masked copy safe for logging
 */
export function safeForLogging<T extends object>(obj: T): T {
  try {
    // Deep clone first to avoid mutating original
    const clone = JSON.parse(JSON.stringify(obj));
    return maskObject(clone);
  } catch {
    // If cloning fails, return minimal info
    return { type: typeof obj, masked: true } as T;
  }
}

/**
 * Mask error stack traces (remove file paths but keep function names)
 */
export function maskStackTrace(stack: string): string {
  return stack
    .split("\n")
    .map(line => {
      // Keep function names but mask full paths
      // "at functionName (/full/path/to/file.ts:123:45)" -> "at functionName (***:123:45)"
      return line.replace(/\(\/[^)]+\/([^/]+:\d+:\d+)\)/g, "(***/$1)");
    })
    .join("\n");
}

/**
 * Extract safe error info for logging
 */
export function safeError(error: Error): object {
  return {
    name: error.name,
    message: maskString(error.message),
    stack: error.stack ? maskStackTrace(error.stack) : undefined,
  };
}

const piiMasking = {
  maskString,
  maskObject,
  safeForLogging,
  maskStackTrace,
  safeError,
};

export default piiMasking;
