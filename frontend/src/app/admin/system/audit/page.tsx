import React, { Suspense } from 'react';
import { AuditTimelineClient } from './AuditTimelineClient';

/**
 * 보안 감사 타임라인 페이지
 * 전사 인프라 내의 행위 추적 및 무결성 검증을 위한 인텔리전스 뷰포트
 */
export default function AuditTimelinePage() {
  // 클라이언트가 useSearchParams(URL 페이지 동기화)를 사용하므로 Suspense 경계가 필요하다.
  return (
    <Suspense fallback={<div className="p-24 text-center text-xs font-bold tracking-widest text-muted-foreground animate-pulse">감사 이력을 불러오는 중...</div>}>
      <AuditTimelineClient />
    </Suspense>
  );
}
