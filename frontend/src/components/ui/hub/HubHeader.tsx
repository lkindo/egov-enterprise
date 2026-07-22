import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubHeaderProps {
  title: string;
  highlight?: string;
  subtitle?: string;
  icon: React.ReactNode | LucideIcon | any;
  className?: string;
  actions?: React.ReactNode;
}

export function HubHeader({ 
  title, 
  highlight, 
  subtitle, 
  icon, 
  className,
  actions
}: HubHeaderProps) {
  const renderIcon = () => {
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const Icon = icon as any;
      return <Icon size={32} />;
    }
    return null;
  };

  return (
    <div className={cn("flex flex-col md:flex-row items-start md:items-center justify-between px-6 gap-8 mb-8 animate-in fade-in slide-in-from-top-8 duration-700", className)}>
      <div className="flex items-center gap-6">
        <div className="hub-icon-box shadow-xl shadow-primary/20 hover:scale-110 transition-transform">
          <div className="text-white dark:text-foreground">
            {renderIcon()}
          </div>
        </div>
        <div className="space-y-1">
          {/*
            같은 화면에서 PageHeader 가 이미 h1 을 렌더하므로(41화면 h1 2중 렌더) 여기서는 h2 로 강등한다.
            시각 스케일은 hub-title-main 토큰을 그대로 유지해 변화가 없다.
            "전자정부" 접두 라벨과 "HUB" 접미 하드코딩 문구는 제거 — 제목은 title/highlight prop 만으로 구성한다.
          */}
          <h2 className="hub-title-main flex items-center gap-3">
             {title} {highlight && <span className="text-primary">{highlight}</span>}
          </h2>
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
