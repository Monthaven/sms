"use client";

import React from "react";
import { useAcceptingMode } from "./AcceptingModeProvider";

export default function AcceptingModeToggle() {
  const { mode, toggle } = useAcceptingMode();

  return (
    <div style={{ position: "fixed", right: 16, top: 16, zIndex: 60 }}>
      <button
        onClick={toggle}
        aria-pressed={mode === "dialing"}
        title="Toggle accepting mode"
        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-sm transition-colors"
        style={{
          background: mode === "dialing" ? "#0f172a" : "#0b1220",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 999, background: mode === "dialing" ? "#10b981" : "#60a5fa" }} />
        <span>{mode === "dialing" ? "Dialing Mode" : "Campaign Mode"}</span>
      </button>
    </div>
  );
}
