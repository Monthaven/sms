/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
};

const PUBLIC_PATHS = ["/signin", "/api/webhooks", "/api/health", "/api/twilio", "/api/cron", "/api/notifications"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSession = Boolean(request.cookies.get("mae_user")?.value);
  const role = request.cookies.get("mae_role")?.value || "AGENT";
  const membership = request.cookies.get("mae_membership")?.value || request.cookies.get("mae_status")?.value || "accepted";

  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => response.headers.set(key, value));

  // Allow public paths and static
  if (isPublic(pathname)) {
    return response;
  }

  // Legacy OM access: allow if intel_session or stack-access is present for /om paths
  if (pathname.startsWith("/om")) {
    const hasOmAccess = request.cookies.get("intel_session") || request.cookies.get("stack-access");
    if (hasOmAccess) {
      return response;
    }
  }

  // Require session for everything else
  if (!hasSession) {
    return NextResponse.redirect(new URL("/signin?next=" + encodeURIComponent(pathname), request.url));
  }

  // Membership gate
  if (membership === "pending" && pathname !== "/awaiting-approval") {
    return NextResponse.redirect(new URL("/awaiting-approval", request.url));
  }

  // Admin guard
  if (pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Manager guard
  if (pathname.startsWith("/dashboard/manager") && !["MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/:path*"],
};
