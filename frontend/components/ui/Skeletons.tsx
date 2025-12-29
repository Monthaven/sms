"use client";

/**
 * PROPRIETARY — Always Improving LLC
 * Loading Skeleton Components
 */

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-gray-200 dark:bg-gray-700 rounded",
        className
      )}
      style={style}
    />
  );
}

/**
 * Card Skeleton
 */
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("p-4 bg-white dark:bg-gray-900 rounded-xl shadow", className)}>
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/**
 * List Item Skeleton
 */
export function ListItemSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 p-3", className)}>
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-1/3 mb-2" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/**
 * Contact List Skeleton
 */
export function ContactListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Message Skeleton
 */
export function MessageSkeleton({ isOutbound = false }: { isOutbound?: boolean }) {
  return (
    <div className={cn(
      "flex mb-3",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] p-3 rounded-2xl",
        isOutbound 
          ? "bg-indigo-100 dark:bg-indigo-900/30 rounded-br-md" 
          : "bg-gray-100 dark:bg-gray-800 rounded-bl-md"
      )}>
        <Skeleton className="h-3 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

/**
 * Conversation Skeleton
 */
export function ConversationSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <MessageSkeleton isOutbound={false} />
      <MessageSkeleton isOutbound={true} />
      <MessageSkeleton isOutbound={false} />
      <MessageSkeleton isOutbound={true} />
      <MessageSkeleton isOutbound={false} />
    </div>
  );
}

/**
 * Stats Card Skeleton
 */
export function StatsCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("p-4 bg-white dark:bg-gray-900 rounded-xl shadow", className)}>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

/**
 * Dashboard Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton className="h-64" />
        <CardSkeleton className="h-64" />
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Skeleton className="h-5 w-32" />
        </div>
        <ContactListSkeleton count={5} />
      </div>
    </div>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 p-3 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="flex gap-4 p-3 border-b border-gray-100 dark:border-gray-800"
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-4 flex-1"
              style={{ opacity: 1 - (rowIndex * 0.1) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Profile/User Card Skeleton
 */
export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="w-16 h-16 rounded-full" />
      <div>
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-3 w-48 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Skeleton className="h-10 w-32 rounded-lg mt-6" />
    </div>
  );
}
