'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StandardSummaryCardProps {
 title: string;
 value: string | number | undefined;
 icon: React.ReactNode;
 unit?: string;
 trend?: {
 value: string;
 isUp?: boolean;
 };
 variant?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'muted';
 isAlert?: boolean;
 className?: string;
}

export function StandardSummaryCard({
 title,
 value,
 icon,
 unit,
 trend,
 variant = 'blue',
 isAlert = false,
 className
}: StandardSummaryCardProps) {
 const variantStyles = {
 blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20",
 green: "bg-green-50 text-green-600 dark:bg-green-900/20",
 red: "bg-red-50 text-red-600 dark:bg-red-900/20",
 orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20",
 purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20",
 muted: "bg-muted/50 text-muted-foreground",
 };

 return (
 <div className={cn(
 "p-6 rounded-2xl border shadow-sm bg-card transition-all hover:shadow-md flex flex-col justify-between",
 isAlert && value && Number(value) > 0 ? "border-red-200 bg-red-50/30 animate-pulse" : "",
 className
 )}>
 <div className="flex justify-between items-start mb-4">
 <div className={cn("p-3 rounded-xl", variantStyles[variant])}>
 {icon}
 </div>
 {trend && (
 <span className={cn(
 "text-[10px] font-black px-2 py-1 rounded",
 trend.isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
 )}>
 {trend.value}
 </span>
 )}
 </div>
 <div>
 <h4 className="text-2xl font-black text-foreground">
 {typeof value === 'number' ? value.toLocaleString() : (value || '0')}
 {unit ? <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span> : null}
 </h4>
 <p className="text-[10px] font-black text-muted-foreground tracking-tight mt-1">
 {title}
 </p>
 </div>
 </div>
 );
}
