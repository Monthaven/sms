/**
 * PROPRIETARY ƒ?" Always Improving LLC
 * Copyright Ac 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement A8.3.
 *
 * Copy of the auth/membership/NDA gate used by the front-door. Adjust PUBLIC_PATHS
 * only if you expose new unauthenticated routes. SIGNIN_PATH and NDA checks stay.
 */

import { NextResponse, type NextRequest } from "next/server";

import { getSessionFromRequest } from "@/lib/auth/get-session";
import { hasUserNdaForDeal } from "@/lib/nda/check";

const PUBLIC_PATHS = new Set([
  "/signin",
  "/request-access",
  "/signup",
  "/nda-complete",
  "/nda-declined",
  "/privacy",
  "/assets",
  "/api/docusign/webhook",
  "/api/notion/webhook",
  "/api/auth/google",
  "/api/auth/stack/session",
  "/api/auth/stack/migrate",
  "/api/allowlist/remember",
  "/api/allowlist/status",
  "/favicon.ico",
  "/robots.txt",
]);

const STATIC_PREFIXES = ["/_next/", "/assets/", "/images/"];
const SIGNIN_PATH = "/signin";
const PORTAL_HOME_PATH = "/dashboard";
const MEMBERSHIP_GATE_PATH = "/awaiting-approval";
const DEAL_DETAIL_PATTERN = /^\/intel\/final\/([^/]+)$/;

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "");
  }
  return pathname;
}

function isStaticAsset(pathname: string) {
  return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function shouldBypass(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || isStaticAsset(pathname);
}

function isPortalRoute(pathname: string) {
  if (pathname.startsWith("/api/")) {
    return false;
  }

  if (pathname === MEMBERSHIP_GATE_PATH) {
    return true;
  }

  return !shouldBypass(pathname);
}

function getDealId(pathname: string) {
  const match = DEAL_DETAIL_PATTERN.exec(pathname);
  return match?.[1] ?? null;
}

function redirectToSignin(req: NextRequest) {
  const url = new URL(SIGNIN_PATH, req.url);
  if (req.nextUrl.pathname !== SIGNIN_PATH) {
    const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
    if (nextPath && nextPath !== SIGNIN_PATH) {
      url.searchParams.set("next", nextPath);
    }
  }
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const pathname = normalizePath(req.nextUrl.pathname);

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const session = await getSessionFromRequest(req);

  if (!session) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL(SIGNIN_PATH, req.url));
    }
    return redirectToSignin(req);
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(PORTAL_HOME_PATH, req.url));
  }

  if (
    pathname === MEMBERSHIP_GATE_PATH &&
    session.membershipStatus === "accepted"
  ) {
    return NextResponse.redirect(new URL(PORTAL_HOME_PATH, req.url));
  }

  if (
    isPortalRoute(pathname) &&
    pathname !== MEMBERSHIP_GATE_PATH &&
    session.membershipStatus !== "accepted"
  ) {
    return NextResponse.redirect(new URL(MEMBERSHIP_GATE_PATH, req.url));
  }

  const dealId = getDealId(pathname);
  if (dealId && session.membershipStatus === "accepted") {
    const hasNda = await hasUserNdaForDeal(session.userId, dealId);
    if (!hasNda) {
      const signUrl = new URL(`/intel/${dealId}/sign-nda`, req.url);
      const nextPath = `${pathname}${req.nextUrl.search}`;
      if (nextPath) {
        signUrl.searchParams.set("next", nextPath);
      }
      return NextResponse.redirect(signUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
