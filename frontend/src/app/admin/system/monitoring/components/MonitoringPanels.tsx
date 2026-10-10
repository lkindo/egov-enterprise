'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, type LucideIcon } from 'lucide-react';

/**
 * 모니터링 허브의 표시 전용 패널 모음.
 *
 * <p>2026-08-05 에 {@code MonitoringHubClient.tsx}(1,387줄)에서 <b>로직 변경 없이 이동</b>했다.
 * 원래 이 컴포넌트들은 허브 본체와 같은 파일의 최상위에 선언돼 있었고, 본체의 상태·쿼리를
 * 전혀 참조하지 않는 순수 표시 컴포넌트다 — 파일을 나눌 때 경계가 이미 거기 있었다.
 *
 * <p>타입 {@code MonitoringTab} 은 탭 모듈(monitoring-tabs.ts)이 소유하므로 여기서 재선언하지 않고 import 한다.
 */
import type { MonitoringTab } from '../monitoring-tabs';

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded border border-warning/40 bg-warning/15 px-2 py-0.5 text-xs text-foreground",
      className
    )}>
      <AlertCircle size={11} aria-hidden="true" /> 샘플 데이터 · 실측 미연동
    </span>
  );
}


export function NavButton({ tab, icon, label, active, onClick }: { tab: MonitoringTab, icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      id={`monitoring-tab-${tab}`}
      aria-selected={active}
      /*
       * 패널 DOM 은 활성 탭 하나뿐이므로 aria-controls 대상 id 도 하나로 고정한다.
       * 종전에는 탭마다 `monitoring-panel-${tab}` 을 가리켜 비활성 6개가 **존재하지 않는 id** 를
       * 참조했다(스크린리더가 따라갈 대상이 없는 참조).
       */
      aria-controls="monitoring-panel"
      onClick={onClick}
      className={cn(
        'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-3 text-[length:var(--font-size-body)] font-medium transition-colors',
        active ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span aria-hidden="true" className="shrink-0">{icon}</span>
      <span className="text-left leading-tight">{label}</span>
    </button>
  );
}

export function StatusIndicator({ label, status, icon: Icon }: { label: string, status: string, icon: LucideIcon }) {
  // 상태 표시등 분기 — 시스템 상태 표시등(healthData.status === 'UP')과 같은 규약.
  // 정상('UP'/'안정')만 초록, 미상('UNKNOWN'/빈값)은 주황, 그 외(DOWN/OUT_OF_SERVICE 등)는 적색으로 장애를 드러낸다.
  const isUp = status === 'UP' || status === '안정';
  const isUnknown = !isUp && (!status || status === 'UNKNOWN');

  return (
    <div className="space-y-2 rounded-md border border-surface-inverse-border bg-surface-inverse-foreground/5 p-3 transition-colors hover:bg-surface-inverse-foreground/10">
      <div className="flex items-center justify-between">
          <p className="text-xs text-surface-inverse-foreground/70">{label}</p>
          <Icon size={14} className="text-surface-inverse-foreground/70" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "size-2.5 shrink-0 rounded-full",
            isUp ? "bg-success" : isUnknown ? "bg-warning" : "bg-destructive"
          )}
        />
        {/* 상태는 색이 아니라 이 문자열이 말한다 — 점은 보조 신호다(WCAG 1.4.1). */}
        <span className="text-lg font-semibold text-surface-inverse-foreground">
          {status}
        </span>
      </div>
    </div>
  );
}
