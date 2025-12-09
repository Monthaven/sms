"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Mode = "dialing" | "campaign";

type ContextShape = {
  mode: Mode;
  setMode: (m: Mode) => void;
  toggle: () => void;
};

const AcceptingModeContext = createContext<ContextShape | null>(null);

const STORAGE_KEY = "mae_accepting_mode";

export function AcceptingModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      return (v as Mode) || "dialing";
    } catch {
      return "dialing";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }, [mode]);

  const setMode = (m: Mode) => setModeState(m);
  const toggle = () => setModeState((s) => (s === "dialing" ? "campaign" : "dialing"));

  return (
    <AcceptingModeContext.Provider value={{ mode, setMode, toggle }}>
      {children}
    </AcceptingModeContext.Provider>
  );
}

export function useAcceptingMode() {
  const ctx = useContext(AcceptingModeContext);
  if (!ctx) throw new Error("useAcceptingMode must be used inside AcceptingModeProvider");
  return ctx;
}

export default AcceptingModeProvider;
