'use client';

import React, { Suspense } from 'react';
import { cn } from '@/lib/utils';
import { DynamicBreadcrumb } from './DynamicBreadcrumb';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title?: string;
  /**
   * [하위호환] 화면에서 직접 넘기는 명시 브레드크럼.
   *
   * 브레드크럼 렌더링은 `DynamicBreadcrumb`(메뉴 SSOT `tb_menu_info` 기반 라벨 해석) 단일 경로로 수렴했다.
   * 기존 소비처(53화면)가 넘기던 이 prop 은 계약 유지를 위해 그대로 살려두며,
   * **우선순위: 명시 props(`breadcrumbs`) > 자동 해석(DynamicBreadcrumb)** 으로 동작한다.
   * 즉 이 값을 넘기면 `customItems` 로 승격되어 자동 해석 결과를 덮어쓴다.
   */
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string; // Standardize with Hub style
}

export function PageHeader({ title, breadcrumbs, actions, className }: PageHeaderProps) {
  // PageHeader 의 { label, href } 계약 → DynamicBreadcrumb 의 { name, href } 계약으로 변환
  const customItems = breadcrumbs?.map(({ label, href }) => ({ name: label, href }));

  return (
    <div className={cn("flex flex-col gap-6 mb-12 animate-in fade-in slide-in-from-left-4 duration-700", className)}>
      {/*
        Breadcrumb — 하드코딩 마크업 제거 후 DynamicBreadcrumb 로 일원화.
        - 자체 mb-4 는 부모의 gap-6 과 겹쳐 이중 여백이 되므로 여기서 상쇄한다.
        - DynamicBreadcrumb 가 useSearchParams 를 쓰므로 정적 프리렌더 페이지의 빌드 실패를 막기 위해
          Suspense 경계를 반드시 유지한다(fallback 은 CLS 방지용 동일 높이 자리표시자).
      */}
      <div className="[&>nav]:mb-0">
        <Suspense fallback={<div className="h-[46px]" aria-hidden="true" />}>
          <DynamicBreadcrumb customItems={customItems} />
        </Suspense>
      </div>

      {/* Title and Actions - Hub Style Scaling */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-4 min-w-0">
           <h1 className="text-3xl md:text-5xl font-[number:var(--font-weight-hub-title)] tracking-tighter text-foreground truncate leading-[1.1]">
            {title}
          </h1>
          {/* Hub-style premium accent bar */}
          <div className="flex gap-1.5">
             <div className="h-1.5 w-12 bg-primary rounded-lg shadow-[0_0_15px_rgba(var(--primary),0.3)] transition-all" />
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
