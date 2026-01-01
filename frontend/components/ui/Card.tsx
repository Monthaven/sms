/**
 * Card primitive with optional header/content/title helpers.
 */
import React from "react";
import clsx from "clsx";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  children: React.ReactNode;
  padded?: boolean;
};

export function Card({ className, children, padded = true, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg shadow-black/20 backdrop-blur",
        padded && "p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("mb-3 flex items-start justify-between gap-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("space-y-3", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={clsx("text-lg font-semibold text-white", className)} {...props}>
      {children}
    </h3>
  );
}

export default Card;
