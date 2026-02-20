'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();

  // Simple auto-breadcrumb logic based on URL segments if breadcrumbs not provided
  const segments = pathname.split('/').filter(Boolean);
  const autoBreadcrumbs: BreadcrumbItem[] = breadcrumbs || segments.map((seg, idx) => ({
    label: seg.toUpperCase(), // Placeholder: In real usage, map segments to Korean names
    href: '/' + segments.slice(0, idx + 1).join('/')
  }));

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Breadcrumb */}
      <nav className="flex items-center text-xs text-muted-foreground gap-1.5">
        <Link href="/" className="hover:text-foreground flex items-center gap-1">
          <Home size={12} />
          í™ˆ
        </Link>
        {autoBreadcrumbs.map((item, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight size={12} />
            {item.href && idx < autoBreadcrumbs.length - 1 ? (
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Title and Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title || autoBreadcrumbs[autoBreadcrumbs.length - 1]?.label}
        </h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      
      <div className="h-1 w-12 bg-primary rounded-full" />
    </div>
  );
}
