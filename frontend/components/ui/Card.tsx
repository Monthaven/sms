import clsx from "clsx";
import React from "react";

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

export default Card;
