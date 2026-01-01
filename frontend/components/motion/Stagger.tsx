/**
 * Simple stagger group wrapper. Falls back to plain divs if animation libs are absent.
 */
"use client";

import React from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
};

export function Stagger({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
