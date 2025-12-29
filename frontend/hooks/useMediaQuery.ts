/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useState, useEffect } from "react";

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${breakpoints.sm - 1}px)`);
}

export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${breakpoints.sm}px) and (max-width: ${breakpoints.lg - 1}px)`
  );
}

export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
}

export function useBreakpoint(): Breakpoint | "xs" {
  const isSm = useMediaQuery(`(min-width: ${breakpoints.sm}px)`);
  const isMd = useMediaQuery(`(min-width: ${breakpoints.md}px)`);
  const isLg = useMediaQuery(`(min-width: ${breakpoints.lg}px)`);
  const isXl = useMediaQuery(`(min-width: ${breakpoints.xl}px)`);
  const is2xl = useMediaQuery(`(min-width: ${breakpoints["2xl"]}px)`);

  if (is2xl) return "2xl";
  if (isXl) return "xl";
  if (isLg) return "lg";
  if (isMd) return "md";
  if (isSm) return "sm";
  return "xs";
}
