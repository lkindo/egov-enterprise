import { AlertCircle, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { userFacingErrorMessage } from '@/lib/safe-error-log';

/**
 * 에러 객체에서 사용자에게 보여 줄 수 있는 문장만 뽑는다(없으면 undefined — 아래 기본 안내가 말한다).
 * [2026-09-15 DEC-OPS-100] 규칙은 `userFacingErrorMessage` 한 곳이 소유한다: 서버가 준 문구는 그대로,
 * axios 가 만든 transport 원문(`Network Error` 등)은 버린다.
 */
function extractErrorMessage(error: unknown): string | undefined {
  return userFacingErrorMessage(error);
}

export function ErrorStateDisplay({
  error,
  onRetry,
  className
}: {
  /** 발생한 에러. axios 에러 / Error / 문자열 모두 허용한다. */
  error?: unknown;
  /** 재조회 콜백. 미지정 시 최후 수단으로 전체 새로고침한다. */
  onRetry?: () => void;
  className?: string;
}) {
  const detailMessage = extractErrorMessage(error);

  return (
    <div
      data-testid="error-state-display"
      role="alert"
      aria-live="assertive"
      className={cn("flex flex-col items-center justify-center gap-3 py-8 text-center", className)}
    >
      <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mb-2 relative border-4 border-rose-100 dark:border-rose-900/20 shadow-xl">
        <AlertCircle size={36} className="text-rose-500" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-rose-900 dark:text-rose-400 tracking-tighter whitespace-pre-line">데이터를 불러오지 못했습니다</p>
        {detailMessage ? (
          <div className="p-4 bg-rose-50/50 dark:bg-rose-900/5 rounded-lg border border-rose-100 dark:border-rose-900/20 inline-block">
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300 tracking-tight opacity-80">
              {detailMessage}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-foreground dark:text-muted-foreground font-medium tracking-tight max-w-[360px] mx-auto leading-relaxed mt-4">
          일시적인 오류로 데이터를 불러오지 못했습니다. <br />네트워크 상태를 확인한 뒤 다시 시도해 주세요.
        </p>
      </div>
      <div className="flex gap-4 mt-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="데이터 다시 불러오기"
          data-testid="error-state-retry"
          className="rounded-md text-xs px-4 hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-colors group"
          onClick={() => {
            if (onRetry) {
              onRetry();
              return;
            }
            if (typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        >
          <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" aria-hidden="true" />
          다시 시도
        </Button>
      </div>
    </div>
  );
}

export function EmptyStateDisplay({
  message = "데이터가 없습니다.",
  description,
  onRetry,
  className
}: {
  /** 빈 상태 제목. 화면 맥락에 맞는 문구를 넘긴다. */
  message?: string;
  /**
   * 보조 안내 문구. 실패를 암시하지 않는 중립 문구를 유지한다.
   * [2026-09-15 DEC-OPS-100] 기본값을 두지 않는다. 종전 기본값은 검색이 없는 표에도 "검색 조건을 변경하거나"를 말해
   * 처음부터 빈 목록을 검색 결과 없음으로 읽히게 했다(first-use-empty). 조건 안내는 조건이 적용된 곳만 넘긴다.
   */
  description?: string;
  /**
   * 재조회 콜백(예: TanStack Query 의 `refetch`).
   * 넘기지 않으면 버튼 자체를 렌더링하지 않는다.
   * 작성 중이던 입력을 파괴하는 전체 새로고침은 의도적으로 제공하지 않는다.
   */
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      data-testid="empty-state-display"
      className={cn("flex flex-col items-center justify-center gap-3 py-8 text-center", className)}
    >
      <Search size={20} className="text-muted-foreground" aria-hidden="true" />
      <div className="space-y-2">
        <p className="text-[length:var(--font-size-body)] font-semibold text-foreground">{message}</p>
        {description ? (
          <p className="text-xs text-muted-foreground max-w-[320px] mx-auto leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="목록 다시 불러오기"
          data-testid="empty-state-retry"
          className="rounded-md text-xs px-4 hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-colors group"
          onClick={onRetry}
        >
          <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" aria-hidden="true" />
          다시 불러오기
        </Button>
      ) : null}
    </div>
  );
}
