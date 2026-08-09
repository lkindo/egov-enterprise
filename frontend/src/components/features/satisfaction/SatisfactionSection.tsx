'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { satisfactionService, Satisfaction } from '@/services/business/board/SatisfactionService';
import { Button } from '@/components/ui/button';
import { Star, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_SCORE = 5;

/** 별 표시. 읽기 전용(점수 렌더)과 입력(클릭 가능) 양쪽에 쓴다. */
function Stars({
  score,
  onSelect,
  size = 16,
}: {
  score: number;
  onSelect?: (n: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: MAX_SCORE }, (_, i) => i + 1).map((n) => {
        const filled = n <= score;
        const star = (
          <Star
            size={size}
            className={cn(filled ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')}
          />
        );
        return onSelect ? (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            aria-label={`${n}점`}
            aria-pressed={filled}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </div>
  );
}

/**
 * 게시글 만족도 위젯.
 *
 * <p>백엔드는 D-8(#302)에서 배선됐으나 화면이 없어 <b>"API 는 있고 화면이 없는"</b> 상태였다.
 * 이 컴포넌트가 그 짝을 맞춘다.
 *
 * <p>삭제는 백엔드가 소유자/관리자 또는 익명 비밀번호로 판정한다 — 화면은 권한을 추측하지 않고
 * 삭제 버튼을 항상 노출한 뒤 <b>서버 판정 결과를 그대로 보여준다</b>. 화면에서 권한을 흉내내면
 * 서버 규칙과 갈라지고, 그 불일치는 조용히 누적된다.
 */
export default function SatisfactionSection({ bbsId, pstId }: { bbsId: string; pstId: string }) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(0);
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const listKey = ['satisfactions', bbsId, pstId];

  const { data: list = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => satisfactionService.list(bbsId, pstId),
  });

  const { data: avg } = useQuery({
    queryKey: ['satisfaction-average', bbsId, pstId],
    queryFn: () => satisfactionService.average(bbsId, pstId),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey });
    queryClient.invalidateQueries({ queryKey: ['satisfaction-average', bbsId, pstId] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      satisfactionService.create(bbsId, pstId, {
        dgstfnScr: score,
        dgstfnCn: content,
        useYn: 'Y',
      } as Satisfaction),
    onSuccess: () => {
      setScore(0);
      setContent('');
      setError(null);
      invalidate();
    },
    onError: (e) => setError(e instanceof Error ? e.message : '등록에 실패했습니다.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (dgstfnSn: number) => satisfactionService.remove(bbsId, pstId, dgstfnSn),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    // 서버가 소유자/관리자 판정에 실패하면 403 이다. 그 사실을 그대로 알린다.
    onError: (e) => setError(e instanceof Error ? e.message : '삭제 권한이 없습니다.'),
  });

  const average = avg?.average ?? 0;

  return (
    <section className="mt-10 border-t pt-8" aria-label="게시글 만족도">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold tracking-tight">만족도</h3>
        <div className="flex items-center gap-2">
          <Stars score={Math.round(average)} />
          <span className="text-sm font-bold text-foreground tabular-nums">
            {average.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground">({list.length}명)</span>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (score < 1) {
            setError('별점을 선택해 주세요.');
            return;
          }
          createMutation.mutate();
        }}
        className="mb-6 p-4 bg-card border rounded-lg space-y-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium shrink-0">별점</span>
          <Stars score={score} onSelect={setScore} size={20} />
        </div>
        {/* placeholder 는 라벨이 아니다 — 입력 중에 사라지고 스크린리더가 라벨로 읽지 않는다. */}
        <textarea
          aria-label="만족도 의견"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="의견을 남겨주세요 (선택)"
          rows={2}
          maxLength={4000}
          className="w-full text-sm border rounded-md p-2 bg-background resize-none"
        />
        {error && <p className="text-sm text-destructive-emphasis">{error}</p>}
        <div className="flex justify-end">
          {/*
            라벨을 '만족도 등록' 으로 한정한다. 이 위젯은 게시글 상세(BoardDetailClient)에서
            댓글 섹션과 **나란히** 놓이므로, 제출 버튼 이름이 겹치면 사용자도 접근성 트리도
            어느 폼의 버튼인지 구분할 수 없다.

            ⚠ 단, **이 개명만으로는 E2E 파손이 해결되지 않았다.**
            22-deep-security-guard 의 셀렉터가 `/Commit Response|등록/i` 로 **앵커 없는 부분
            일치**여서 '만족도 등록' 도 그대로 걸렸다(2026-08-06 CI 실측 — 개명 후에도 동일한
            strict mode violation). 실제 수정은 그 테스트의 셀렉터에서 이 버튼을 맞춘 적조차
            없는 '등록' 대안을 제거한 것이다. 이 라벨 변경은 UI 명료성 목적으로 남긴다.
          */}
          <Button type="submit" size="sm" disabled={createMutation.isPending}>
            {createMutation.isPending ? '만족도 등록 중…' : '만족도 등록'}
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          아직 등록된 만족도가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((item) => (
            <li key={item.dgstfnSn} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <Stars score={item.dgstfnScr ?? 0} size={14} />
                  <span className="text-xs font-bold text-foreground">{item.userNm || '익명'}</span>
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {item.crtDt ? item.crtDt.substring(0, 10) : ''}
                  </span>
                </div>
                {item.dgstfnCn && (
                  <p className="text-sm text-muted-foreground break-words">{item.dgstfnCn}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`${item.userNm || '익명'}의 만족도 삭제`}
                className="h-8 w-8 text-destructive-emphasis hover:bg-destructive/10 shrink-0"
                disabled={deleteMutation.isPending}
                onClick={() => item.dgstfnSn && deleteMutation.mutate(item.dgstfnSn)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
