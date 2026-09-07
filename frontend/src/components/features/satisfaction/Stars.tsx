'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_SCORE = 5;

/** 별 표시. 읽기 전용(점수 렌더)과 입력(클릭 가능) 양쪽에 쓴다. */
export function Stars({
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
            role="radio"
            aria-checked={n === score}
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

