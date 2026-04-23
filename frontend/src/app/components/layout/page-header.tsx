'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string; // Standardize with Hub style
}

export function PageHeader({ title, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-6 mb-12 animate-in fade-in slide-in-from-left-4 duration-700", className)}>
      {/* Breadcrumb - Premium Styling */}
      {breadcrumbs && (
        <nav className="flex items-center text-[10px] md:text-[11px] font-black text-muted-foreground/40 gap-1.5 ml-0.5 uppercase tracking-[0.2em]">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1.5 group">
            <Home size={12} className="group-hover:scale-110 transition-transform" />
            <span>HOME</span>
          </Link>
          {breadcrumbs.map((item, idx) => (
            <React.Fragment key={`breadcrumb-${idx}`}>
              <ChevronRight size={10} className="opacity-40" />
              {item.href ? (
                <Link href={item.href} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={idx === breadcrumbs.length - 1 ? "font-black text-muted-foreground/80" : ""}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title and Actions - Hub Style Scaling */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-4 min-w-0">
           <h1 className="text-3xl md:text-5xl font-[number:var(--font-weight-hub-title)] tracking-[var(--letter-spacing-hub)] text-foreground truncate leading-[1.1]">
            {title}
          </h1>
          {/* Hub-style premium accent bar */}
          <div className="flex gap-1.5">
             <div className="h-1.5 w-12 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)] transition" />
             <div className="h-1.5 w-1.5 bg-primary/30 rounded-full" />
             <div className="h-1.5 w-1.5 bg-primary/10 rounded-full" />
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-3 flex-wrap animate-in fade-in zoom-in-95 duration-1000 delay-300">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
