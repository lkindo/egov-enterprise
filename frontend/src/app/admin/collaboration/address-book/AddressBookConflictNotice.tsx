import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

export function isAddressBookConflict(error: unknown): boolean {
  return typeof error === 'object' && error !== null
    && (error as { response?: { status?: number } }).response?.status === 409;
}

/** 최신 조회와 변경 재적용을 별도 선택으로 둔다. 조회만으로 편집 기준을 바꾸지 않는다. */
export function AddressBookConflictNotice({
  isReloading,
  isApplying = false,
  hasLatest,
  reloadError,
  canReapply = true,
  onReload,
  onDiscard,
  onReapply,
  children,
}: {
  isReloading: boolean;
  isApplying?: boolean;
  hasLatest: boolean;
  reloadError: string | null;
  canReapply?: boolean;
  onReload: () => void;
  onDiscard: () => void;
  onReapply: () => void;
  children?: ReactNode;
}) {
  return (
    <section role="alert" aria-label="다른 변경과 충돌했습니다" className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
      <p className="font-bold text-foreground">다른 변경과 충돌했습니다.</p>
      <p className="text-sm text-muted-foreground">
        입력한 내용은 보존했습니다. 최신 내용을 확인하고, 내 변경을 다시 반영할지 선택해 주세요.
      </p>
      <Button type="button" variant="outline" disabled={isReloading || isApplying} aria-busy={isReloading || undefined} onClick={onReload}>
        {isReloading ? '최신 내용 확인 중…' : '최신 내용 확인'}
      </Button>
      {reloadError ? <p className="text-sm text-destructive-emphasis">{reloadError}</p> : null}
      {hasLatest ? (
        <>
          {children}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={isReloading || isApplying} onClick={onDiscard}>
              내 변경 취소하고 최신 내용 보기
            </Button>
            <Button type="button" disabled={isReloading || isApplying || !canReapply} aria-busy={isApplying || undefined} onClick={onReapply}>
              {isApplying ? '내 변경 반영 중…' : '최신 내용에 내 변경 반영'}
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
