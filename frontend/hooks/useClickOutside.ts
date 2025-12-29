/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 */

"use client";

import { useEffect, useRef, useCallback, type RefObject } from "react";

export function useClickOutside<T extends HTMLElement>(
  handler: () => void
): RefObject<T> {
  const ref = useRef<T>(null!);

  const handleClickOutside = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    },
    [handler]
  );

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [handleClickOutside]);

  return ref;
}
