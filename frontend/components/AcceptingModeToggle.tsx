/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from "react";
import { useAcceptingMode } from "./AcceptingModeProvider";
import clsx from "clsx";

export default function AcceptingModeToggle() {
  const { mode, toggle } = useAcceptingMode();
  const isDialing = mode === "dialing";

  return (
    <div className="fixed right-6 bottom-6 z-[60]">
      <button
        onClick={toggle}
        aria-pressed={isDialing}
        title={`Switch to ${isDialing ? 'Campaign' : 'Dialing'} Mode`}
        aria-label={`Currently in ${mode} mode. Click to switch.`}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-lg transition-colors border border-white/10 bg-slate-900/95 text-white backdrop-blur-lg hover:bg-slate-800"
      >
        <span
          className={clsx(
            "w-2 h-2 rounded-full",
            isDialing ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-blue-400 shadow-[0_0_6px_#60a5fa]"
          )}
        />
        <span>{isDialing ? "Dialing Mode" : "Campaign Mode"}</span>
      </button>
    </div>
  );
}
