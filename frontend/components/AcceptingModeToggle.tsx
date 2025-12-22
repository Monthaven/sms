/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import React from "react";
import { useAcceptingMode } from "./AcceptingModeProvider";

export default function AcceptingModeToggle() {
  const { mode, toggle } = useAcceptingMode();

  return (
    <div className="fixed right-6 bottom-6 z-50">
      <button
        onClick={toggle}
        aria-pressed={mode === "dialing"}
        title="Toggle accepting mode"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-sm transition-colors border border-white/10 bg-slate-900/90 text-white backdrop-blur"
      >
        <span
          style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999 }}
          className={mode === "dialing" ? "bg-emerald-500" : "bg-blue-400"}
        />
        <span>{mode === "dialing" ? "Dialing Mode" : "Campaign Mode"}</span>
      </button>
    </div>
  );
}
