'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
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
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center gap-2 px-8 py-4 text-sm font-black border-b-2 transition-all",
              activeTab === item.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex bg-card border rounded-2xl p-1.5 w-fit shadow-sm", className)}>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
            activeTab === item.id
              ? "bg-primary text-white shadow-md"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
