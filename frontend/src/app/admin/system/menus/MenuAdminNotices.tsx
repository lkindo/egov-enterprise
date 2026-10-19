'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 시스템 메뉴 관리 머리의 알림 — 조회 실패, 다른 곳의 변경(409), 거부된 저장(2026-10-18 화면 분해 때 MenuAdminClient 에서
 * 옮겼다 — 마크업·문구 그대로). 셋 다 없으면 화면이 이 컴포넌트를 그리지 않는다.
 */
export function MenuAdminNotices({
  loadError,
  staleMessage,
  saveError,
  saveErrorCurrent,
  hasChanges,
  reloadPending,
  isSaving,
  onReload,
}: {
  /** 다시 불러오기 실패 또는 처음 조회 실패의 사유(없으면 null — 다시 불러오기 실패가 앞선다). */
  loadError: string | null;
  staleMessage: string | null;
  saveError: { message: string } | null;
  /** 거부된 초안이 지금 초안인가 — 아니면 '마지막 저장 시도' 로 말한다. */
  saveErrorCurrent: boolean;
  hasChanges: boolean;
  reloadPending: boolean;
  isSaving: boolean;
  onReload: () => void;
}) {
  return (
          <div className="space-y-2">
            {loadError !== null && (
              <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive-emphasis" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-destructive-emphasis">메뉴 구조를 불러오지 못했습니다</p>
                    <p className="text-xs text-muted-foreground">{loadError} — 아래 보드는 비어 있거나 최신 상태가 아닐 수 있습니다.</p>
                  </div>
                </div>
                <Button type="button" variant="outline" disabled={reloadPending} aria-busy={reloadPending || undefined}
                  onClick={onReload} className="shrink-0 gap-2 font-semibold">
                  <RefreshCcw size={16} aria-hidden="true" /> 메뉴 구조 다시 불러오기
                </Button>
              </div>
            )}
            {staleMessage && (
              <div role="alert" className="flex flex-col gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">다른 곳에서 메뉴 구조나 그룹 권한이 바뀌었습니다</p>
                  <p className="text-xs text-foreground">
                    {staleMessage}{' '}
                    {hasChanges
                      ? '지금 변경은 지우지 않았습니다. 다시 불러오면 지금 변경은 사라집니다.'
                      : '저장하지 않은 변경은 이제 없습니다. 최신 구조를 보려면 다시 불러오세요.'}
                  </p>
                </div>
                <Button type="button" variant="outline" disabled={reloadPending || isSaving} aria-busy={reloadPending || undefined}
                  onClick={onReload} className="shrink-0 gap-2 font-semibold">
                  <RefreshCcw size={16} aria-hidden="true" /> 다시 불러오기
                </Button>
              </div>
            )}
            {saveError && (
              <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive-emphasis">
                  {saveErrorCurrent ? '변경을 저장하지 못했습니다' : '마지막 저장 시도를 서버가 거부했습니다'}
                </p>
                <p className="mt-1 text-xs text-foreground">
                  {saveError.message}
                  {saveErrorCurrent ? '' : ' 그 뒤 초안을 바꿨습니다. 다시 저장하면 서버가 다시 확인합니다.'}
                </p>
              </div>
            )}
          </div>
  );
}
