/**
 * Lightweight fade-in wrapper. If motion is unavailable, it just renders children.
 */
"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
};

export function FadeIn({ children, className, delay, duration }: Props) {
  const style: React.CSSProperties = {};
  if (delay) style.animationDelay = `${delay}s`;
  if (duration) style.animationDuration = `${duration}s`;
  return (
    <div className={className} style={Object.keys(style).length ? style : undefined}>
      {children}
    </div>
  );
}
