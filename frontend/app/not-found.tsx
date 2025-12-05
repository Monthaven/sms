"use client";

import Link from "next/link";
import { ArrowLeft, Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-slate-100">
      <p className="pill text-rose-200/80">404 · Signal Lost</p>
      <h1 className="mt-4 text-4xl font-semibold text-white">We can’t find that route in the Storefront.</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The Engine might not have synced this page yet. Accept a fallback below or jump back into the Command Center.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link href="/dashboard" className="mae-button primary text-sm">
          <Home className="h-4 w-4" />
          Return to Dashboard
        </Link>
        <Link href="/dashboard/admin" className="mae-button ghost text-sm">
          <Compass className="h-4 w-4" />
          Open Control Tower
        </Link>
        <Link href="/" className="mae-button ghost text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
      </div>
    </div>
  );
}
