/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export function SystemGauge({ value = 75 }: { value?: number }) {
  const data = [
    { name: 'Value', value: value },
    { name: 'Empty', value: 100 - value }
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 h-full flex flex-col relative overflow-hidden group">
      <div className="flex justify-between items-center mb-2 z-10">
        <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">System Status</h3>
        <div className="flex items-center gap-2">
           <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></span>
           <span className="text-[10px] text-emerald-400 font-medium">Operational</span>
        </div>
      </div>
      
      <div className="relative flex-1 flex items-center justify-center min-h-[140px]">
        <ResponsiveContainer width="100%" height={180} minWidth={180} minHeight={140}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={85}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill="#3B82F6" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <Cell fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-3xl font-bold text-white">{value}%</div>
          <div className="text-[10px] text-slate-400 tracking-wider">LOAD</div>
        </div>
      </div>

      {/* Decorative Bottom Grid */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50"></div>
    </div>
  );
}
