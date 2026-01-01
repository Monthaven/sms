/**
 * Simple layout section wrapper for portal pages.
 */
import React from "react";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export function Section({ title, subtitle, children, className }: Props) {
  return (
    <section className={className}>
      {(title || subtitle) && (
        <header className="mb-6 space-y-1">
          {title ? <h2 className="text-2xl font-semibold text-white">{title}</h2> : null}
          {subtitle ? <p className="text-slate-400">{subtitle}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}
