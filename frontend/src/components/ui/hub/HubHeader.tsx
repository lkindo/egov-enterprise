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
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-lg bg-primary flex items-center justify-center">
          <div className="text-primary-foreground">
            {renderHubIcon(icon, 22)}
          </div>
        </div>
        <div className="space-y-1">
          {/* 시각 스케일은 동일하게 유지하고, effective route에서의 역할만 명시적으로 고른다. */}
          <Heading className="text-2xl font-bold tracking-tight flex flex-wrap items-center gap-2">
             {title} {highlight && <span className="text-primary">{highlight}</span>}
          </Heading>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">
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
