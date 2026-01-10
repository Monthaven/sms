/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 *
 * SMS Frontend Middleware - Stack Auth Integration
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
};

const PUBLIC_PATHS = ["/signin", "/api/webhooks", "/api/health", "/api/twilio", "/api/cron", "/api/notifications"];
const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http: ws: wss:",
  "frame-ancestors 'none'",
].join("; ");

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  );
}

// JWKS resolver for Stack Auth JWT verification
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function resolveJwks() {
  if (!jwks) {
    const jwksUrl = process.env.STACK_AUTH_JWKS_URL ?? process.env.STACK_JWKS_URL;
    if (!jwksUrl) {
      throw new Error("Missing STACK_AUTH_JWKS_URL");
    }
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

async function verifyStackSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, resolveJwks(), {
      algorithms: ["RS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

/**
 * Extract role from Stack JWT claims (from Stack Teams)
 * Maps team names to SMS role enum values
 */
function getRoleFromClaims(claims: any): string {
  const teams = (claims.teams as any[]) || [];
  const teamNames = teams.map((t) => t.name.toLowerCase());

  // Priority order for role assignment
  if (teamNames.includes("admin")) return "ADMIN";
  if (teamNames.includes("manager")) return "MANAGER";
  if (teamNames.includes("caller") || teamNames.includes("agent")) return "AGENT";

  return "AGENT"; // Default role
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));
  if (isProd) {
    response.headers.set("Content-Security-Policy", csp);
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  // CSRF protection via origin/referrer check for mutating API calls (exclude third-party webhooks)
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
  const isWebhook = pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/twilio/voice");
  if (mutating && !isWebhook && !isPublic(pathname)) {
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || "";
    const allowedOrigin = request.nextUrl.origin;
    if (origin && origin !== allowedOrigin) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
    if (!origin && referer && !referer.startsWith(allowedOrigin)) {
      return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
    }
  }

  // Allow public paths and static assets
  if (isPublic(pathname)) {
    return response;
  }

  // Verify Stack Auth session
  const sessionToken = request.cookies.get("stack_session")?.value;

  if (!sessionToken) {
    // Redirect to centralized auth portal
    const authUrl = new URL("https://app.monthavencapital.com/signin");
    authUrl.searchParams.set("next", `https://sms.monthavencapital.com${pathname}`);
    return NextResponse.redirect(authUrl);
  }

  const claims = await verifyStackSession(sessionToken);

  if (!claims) {
    // Invalid session - redirect to auth portal
    const authUrl = new URL("https://app.monthavencapital.com/signin");
    authUrl.searchParams.set("next", `https://sms.monthavencapital.com${pathname}`);
    return NextResponse.redirect(authUrl);
  }

  // Extract role from Stack Teams
  const role = getRoleFromClaims(claims);
  const membership = (claims.membership_status as string) || "accepted";

  // Membership gate (pending users redirected to approval page)
  if (membership === "pending" && pathname !== "/awaiting-approval") {
    return NextResponse.redirect(new URL("/awaiting-approval", request.url));
  }

  // Admin guard - non-admins cannot access /dashboard/admin
  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Manager guard - only MANAGER and ADMIN can access /dashboard/manager
  if (pathname.startsWith("/dashboard/manager") && !["MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
