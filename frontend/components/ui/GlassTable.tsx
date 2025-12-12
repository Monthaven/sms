import React from 'react';
import { ChevronDown, MoreHorizontal } from 'lucide-react';
import clsx from 'clsx';

interface Column {
  header: string;
  accessor: string;
  className?: string;
  cell?: (row: any) => React.ReactNode;
}

interface GlassTableProps {
  columns: Column[];
  data: any[];
  actions?: (row: any) => React.ReactNode;
}

export function GlassTable({ columns, data, actions }: GlassTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-700/50 bg-slate-800/50">
            {columns.map((col, i) => (
              <th key={i} className={clsx("p-4 font-medium text-slate-400 uppercase text-[10px] tracking-wider", col.className)}>
                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                  {col.header}
                  <ChevronDown size={12} />
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
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
              {actions && (
                <td className="p-4 text-right">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
