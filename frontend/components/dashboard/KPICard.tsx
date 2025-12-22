/**
 * PROPRIETARY — Always Improving LLC
 * Copyright © 2025. All Rights Reserved.
 * No license granted. Access under Shareholders' Agreement §8.3.
 */

"use client";

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import React from 'react';
import Card from '@/components/ui/Card';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  data?: { v: number }[];
  icon?: React.ReactNode;
  delay?: number;
}

export function KPICard({ title, value, trend, trendUp, data, icon, delay = 0 }: KPICardProps) {
  return (
    <Card className="relative overflow-hidden group" padded style={{ animationDelay: `${delay}ms` } as any}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">{title}</h3>
          <div className="text-3xl font-bold text-white mt-1 group-hover:text-blue-400 transition-colors shadow-blue-500/50">
            {value}
          </div>
        </div>
        {icon && (
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            {icon}
          </div>
        )}
      </div>

      {/* Footer / Chart */}
      <div className="flex items-end justify-between relative z-10">
        {trend && (
          <div className={`flex items-center text-sm font-medium ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? <ArrowUpRight size={16} className="mr-1" /> : <ArrowDownRight size={16} className="mr-1" />}
            {trend}
          </div>
        )}
        
        {/* Sparkline Chart */}
        {data && (
          <div className="h-12 w-28 absolute -bottom-1 -right-1 opacity-40 group-hover:opacity-100 transition-opacity duration-500">
            <ResponsiveContainer width="100%" height={48} minWidth={112} minHeight={48}>
              <AreaChart data={data as any}>
                <defs>
                  <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendUp ? '#10B981' : '#3B82F6'} stopOpacity={0.5}/>
                    <stop offset="100%" stopColor={trendUp ? '#10B981' : '#3B82F6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="v" 
                  stroke={trendUp ? '#10B981' : '#3B82F6'} 
                  strokeWidth={2} 
                  fill={`url(#grad-${title})`} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Background Glow Effect on Hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/0 via-blue-600/10 to-blue-600/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-700 pointer-events-none" />
    </Card>
  );
}
