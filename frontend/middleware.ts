/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers for all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
};

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("mae_user")?.value);
  const role = request.cookies.get("mae_role")?.value || "AGENT";
  
  // Create response with security headers
  const response = NextResponse.next();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Block non-admin access to admin routes
  if (request.nextUrl.pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  if (request.nextUrl.pathname.startsWith("/dashboard") && !hasSession) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  if (request.nextUrl.pathname === "/" && hasSession) {
    const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.url));
    Object.entries(securityHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
