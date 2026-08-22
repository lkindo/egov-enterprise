'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

/**
 * 라우트 전환 진입 애니메이션.
 *
 * 🚨 `AnimatePresence` + `exit` 를 다시 넣지 마라 — 이 위치에서는 구조적으로 깨진다.
 *
 * `{children}` 은 App Router 의 **세그먼트 렌더러**이지 렌더 시점의 스냅샷이 아니다.
 * exit 로 구 `key={pathname}` subtree 를 붙잡으면 그 안의 `{children}` 이 정지하지 않고
 * **현재(=목적지) 라우트를 다시 렌더한다.** 결과는 목적지 페이지의 이중 마운트다:
 *   - DOM 선두가 exit 중인 ghost 라 전환 직후 사용자가 입력한 값이 ghost 로 들어가고
 *     exit 완료 시 **입력이 통째로 소실**된다(폼 화면에서 데이터 유실).
 *   - 모든 testid·aria-label 이 일시적으로 2배가 되어 자동화 계약이 strict mode 로 깨진다.
 * 2026-08-22 CI run 32555133776 shard 2 에서 실제로 관측됐다 — 편집 폼 2벌이 서로 다른 본문을
 * 들고 동시 존재했다(`getByRole('button',{name:'게시글 수정'})` → 2 elements).
 * 종전 e2e 가 초록이던 것은 `.first()` 가 ghost 의 submit 을 눌러 **원본 값을 저장하면서도**
 * 통과하던 false-green 이었다.
 *
 * 진입 애니메이션은 `key={pathname}` 의 remount 만으로 성립하므로 그대로 유지된다.
 * `mode="wait"` 는 동시 마운트는 없애지만 라우트마다 지연이 붙고 "exit subtree 가 새 라우트를
 * 렌더한다"는 성질 자체는 남으므로 채택하지 않는다.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.15,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
