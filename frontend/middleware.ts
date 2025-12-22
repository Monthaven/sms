/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("mae_user")?.value);
  const role = request.cookies.get("mae_role")?.value || "AGENT";

  // Block non-admin access to admin routes
  if (request.nextUrl.pathname.startsWith("/dashboard/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (request.nextUrl.pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (request.nextUrl.pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
