'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MenuInfo } from '@/types/menu';

interface SidebarItemProps {
  item: MenuInfo;
  isActive: boolean;
  Icon: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
}

export const SidebarItem = memo(({ item, isActive, Icon }: SidebarItemProps) => {
  const href = item.chkURL || `/${item.progrmFileNm?.toLowerCase() || ''}`;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon size={18} />
        {item.menuNm}
      </div>
      <ChevronRight size={14} className="opacity-50" />
    </Link>
  );
});

SidebarItem.displayName = 'SidebarItem';
