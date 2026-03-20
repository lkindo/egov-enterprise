'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 mb-8">
      {/* Breadcrumb */}
      {breadcrumbs && (
        <nav className="flex items-center text-[10px] md:text-xs text-muted-foreground/60 gap-1 ml-0.5">
          <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1 group">
            <Home size={11} className="group-hover:scale-110 transition-transform" />
            <span>홈</span>
          </Link>
          {breadcrumbs.map((item, idx) => (
            <React.Fragment key={`breadcrumb-${idx}`}>
              <ChevronRight size={10} className="opacity-40" />
              {item.href ? (
                <Link href={item.href} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={idx === breadcrumbs.length - 1 ? "font-bold text-muted-foreground" : ""}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">
            {title}
          </h1>
          <div className="h-0.5 w-10 bg-primary/40 rounded-full" />
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
