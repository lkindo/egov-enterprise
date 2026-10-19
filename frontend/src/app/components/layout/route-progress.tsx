'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type Phase = 'idle' | 'loading' | 'leaving';

/** 막대가 자라기 시작한 뒤 사라지기 시작하기까지(ms). */
const LOADING_MS = 400;
/** 사라지는 데 걸리는 시간(ms). globals.css 의 duration-600 과 같다. */
const LEAVING_MS = 600;

/**
 * 라우트가 바뀌면 화면 맨 위에 진행 막대를 잠깐 보인다.
 *
 * [2026-10-19] 애니메이션 라이브러리 없이 CSS 로 그린다 — 이 컴포넌트는 모든 라우트에서 하이드레이션 직후 실린다.
 *   자라기는 globals.css 의 `animate-route-progress`(0.6초 원형 가속), 사라지기는 opacity 전환(0.6초)이다. 종전과 같이
 *   400ms 뒤 사라지기 시작해 자라기와 겹친다. 사용자가 동작 줄이기를 고르면 globals.css 의 reduced-motion 규칙이 둘 다 즉시 끝낸다.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentKey = `${pathname}?${searchParams.toString()}`;
  const [prevKey, setPrevKey] = useState(currentKey);
  const [phase, setPhase] = useState<Phase>('idle');
  // 사라지는 중에 다시 이동하면 막대를 처음부터 다시 그린다(key 로 새로 마운트해 자라기 애니메이션을 다시 시작한다).
  const [run, setRun] = useState(0);

  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    if (phase !== 'loading') {
      setPhase('loading');
      setRun(run + 1);
    }
  }

  useEffect(() => {
    if (phase === 'idle') return;
    const timer = setTimeout(
      () => setPhase(phase === 'loading' ? 'leaving' : 'idle'),
      phase === 'loading' ? LOADING_MS : LEAVING_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, run]);

  if (phase === 'idle') return null;

  return (
    <div
      key={run}
      data-phase={phase}
      className="fixed top-0 left-0 right-0 z-[9999] h-1 animate-route-progress bg-gradient-to-r from-primary/40 via-primary to-primary/80 transition-opacity duration-600 ease-circ-in data-[phase=leaving]:opacity-0"
    />
  );
}
