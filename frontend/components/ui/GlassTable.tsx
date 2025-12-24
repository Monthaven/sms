/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

import React from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface Column<T> {
  header: string;
  accessor: keyof T | string;
  className?: string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface GlassTableProps<T> {
  columns: Column<T>[];
  data: T[];
  actions?: (row: T) => React.ReactNode;
}

export function GlassTable<T extends object>({ columns, data, actions }: GlassTableProps<T>) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50">
            {columns.map((col, i) => (
              <th key={i} className={clsx("p-4 font-medium text-slate-400 uppercase text-[10px] tracking-wider", col.className)}>
                <div className={clsx(
                  "flex items-center gap-1",
                  col.sortable && "cursor-pointer hover:text-white transition-colors"
                )}>
                  {col.header}
                  {col.sortable && <ChevronDown size={12} />}
                </div>
              </th>
            ))}
            {actions && <th className="p-4 w-[50px]"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          {data.map((row, i) => (
            <tr key={i} className="group hover:bg-slate-800/40 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="p-4 text-slate-300">
                  {col.cell ? col.cell(row) : String(row[col.accessor as keyof T] ?? '')}
                </td>
              ))}
              {actions && (
                <td className="p-4 text-right">
                  <div className="transition-opacity opacity-100 md:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
                    {actions(row)}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
