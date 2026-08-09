import { AlertCircle, RefreshCw, Search, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

/**
 * 에러 객체에서 사람이 읽을 수 있는 메시지를 안전하게 추출한다.
 * axios 에러(`response.data.message`)와 일반 `Error.message`를 모두 지원하며,
 * 형태가 다르면 조용히 undefined 를 반환한다(문구는 호출부의 기본 안내로 대체).
 */
function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'string') {
    return error.trim() || undefined;
  }
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };

  const apiMessage = candidate.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    return apiMessage.trim();
  }
  if (typeof candidate.message === 'string' && candidate.message.trim()) {
    return candidate.message.trim();
  }
  return undefined;
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
    <motion.div
      data-testid="error-state-display"
      role="alert"
      aria-live="assertive"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center gap-6 py-12 text-center", className)}
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
          size="lg"
          aria-label="데이터 다시 불러오기"
          data-testid="error-state-retry"
          className="rounded-lg font-bold text-xs tracking-[0.1em] border-2 px-10 hover:bg-surface-inverse hover:text-white dark:hover:bg-primary transition-all group shadow-lg"
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
    </motion.div>
  );
}

export function EmptyStateDisplay({
  message = "데이터가 없습니다.",
  description = "조건에 해당하는 항목이 없습니다. 검색 조건을 변경하거나 초기화한 뒤 다시 확인해 주세요.",
  onRetry,
  className
}: {
  /** 빈 상태 제목. 화면 맥락에 맞는 문구를 넘긴다. */
  message?: string;
  /** 보조 안내 문구. 실패를 암시하지 않는 중립 문구를 유지한다. */
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
    <motion.div
      data-testid="empty-state-display"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center gap-6 py-12 text-center", className)}
    >
      <div className="w-20 h-11 bg-muted/30 rounded-lg flex items-center justify-center mb-2 relative">
        <Search size={40} className="text-muted-foreground/20" aria-hidden="true" />
        <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-background border-2 border-border rounded-lg flex items-center justify-center">
          <List size={14} className="text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-foreground tracking-tighter">{message}</p>
        {description ? (
          <p className="text-xs text-foreground dark:text-muted-foreground font-bold tracking-tight max-w-[320px] mx-auto leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          aria-label="목록 다시 불러오기"
          data-testid="empty-state-retry"
          className="mt-6 rounded-lg font-bold text-xs tracking-[0.2em] border-2 px-10 hover:bg-surface-inverse hover:text-white dark:hover:bg-primary transition-all group"
          onClick={onRetry}
        >
          <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" aria-hidden="true" />
          다시 불러오기
        </Button>
      ) : null}
    </motion.div>
  );
}
