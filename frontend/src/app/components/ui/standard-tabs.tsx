'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TabItem {
 id: string;
 label: string;
 icon?: React.ReactNode;
 count?: number;
}

interface StandardTabsProps {
 items: TabItem[];
 activeTab: string;
 onChange: (id: string) => void;
 variant?: 'underline' | 'pills';
 className?: string;
}

export function StandardTabs({
 items,
 activeTab,
 onChange,
 variant = 'pills',
 className
}: StandardTabsProps) {
 if (variant === 'underline') {
 return (
 <div className={cn("flex border-b w-full", className)}>
 {items.map((item) => (
 <button
 key={item.id}
 type="button"
 aria-pressed={activeTab === item.id}
 aria-label={typeof item.count === 'number' ? `${item.label} ${item.count}건` : item.label}
 onClick={() => onChange(item.id)}
 className={cn(
 "flex items-center gap-2 px-8 py-4 text-sm font-bold border-b-2 transition-all",
 activeTab === item.id
 ? "border-primary text-primary bg-primary/5"
 : "border-transparent text-muted-foreground hover:text-foreground"
 )}
 >
 {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
 {item.label}
 {typeof item.count === 'number' ? <span aria-label={`${item.count}건`}>{item.count}</span> : null}
 </button>
 ))}
 </div>
 );
 }

 return (
 <div className={cn("flex bg-card border rounded-lg p-1.5 w-fit shadow-sm", className)}>
 {items.map((item) => (
 <button
 key={item.id}
 type="button"
 aria-pressed={activeTab === item.id}
 aria-label={typeof item.count === 'number' ? `${item.label} ${item.count}건` : item.label}
 onClick={() => onChange(item.id)}
 className={cn(
 "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
 activeTab === item.id
 ? "bg-primary text-white shadow-md"
 : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
 )}
 >
 {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
 {item.label}
 {typeof item.count === 'number' ? <span aria-label={`${item.count}건`}>{item.count}</span> : null}
 </button>
 ))}
 </div>
 );
}
