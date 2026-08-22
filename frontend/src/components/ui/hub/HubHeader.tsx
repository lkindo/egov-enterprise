import React from 'react';
import { cn } from '@/lib/utils';
import { HubIcon, renderHubIcon } from './hub-icon';

interface HubHeaderProps {
  title: string;
  highlight?: string;
  subtitle?: string;
  icon: HubIcon;
  /** PageHeader 아래의 섹션이면 h2(기본), 이 컴포넌트가 페이지 제목을 소유할 때만 h1. */
  headingLevel?: 1 | 2;
  className?: string;
  actions?: React.ReactNode;
}

export function HubHeader({ 
  title, 
  highlight, 
  subtitle, 
  icon, 
  headingLevel = 2,
  className,
  actions
}: HubHeaderProps) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between px-6 gap-8 mb-8 animate-in fade-in slide-in-from-top-8 duration-700", className)}>
      <div className="flex items-center gap-6">
        <div className="hub-icon-box shadow-xl shadow-primary/20 hover:scale-110 transition-transform">
          <div className="text-white dark:text-foreground">
            {renderHubIcon(icon, 32)}
          </div>
        </div>
        <div className="space-y-1">
          {/* 시각 스케일은 동일하게 유지하고, effective route에서의 역할만 명시적으로 고른다. */}
          <Heading className="hub-title-main flex items-center gap-3">
             {title} {highlight && <span className="text-primary">{highlight}</span>}
          </Heading>
          {subtitle && (
            <p className="hub-subtitle-label mt-2 tracking-tight">
               {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-lg border border-border/50 shadow-inner">
          {actions}
        </div>
      )}
    </div>
  );
}
