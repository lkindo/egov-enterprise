/**
 * 이 탭에서 앱 안으로 이동해 온 직전 경로(pathname)를 기억한다(2026-10-01).
 *
 * 상세 화면의 '목록으로' 는 두 가지로 갈려 있었다. `router.back()` 은 목록에서 왔을 때만 맞고, 딥링크·새 탭으로
 * 연 상세에서는 앱 밖(또는 전혀 다른 화면)으로 나갔다. 고정 경로 링크는 반대로 목록에서 왔을 때 페이지·검색 조건을
 * 잃었다. 직전 경로를 알면 둘을 가를 수 있다 — 목록에서 왔으면 뒤로 가서 조건·스크롤을 되살리고, 아니면 목록으로 간다.
 *
 * 모듈 메모리에만 둔다. 새로고침·새 탭은 앱 안 이동이 아니므로 직전 경로가 없는 것이 사실과 같다. 쿼리는 싣지 않는다 —
 * 판정은 경로만으로 하고, 조건 복원은 방문 기록(뒤로 가기)이 한다.
 */
let current: string | null = null;
let previous: string | null = null;

/** 경로가 바뀔 때마다 부른다. 같은 경로(쿼리만 바뀜)는 이동으로 세지 않는다. */
export function recordRoute(pathname: string): void {
  if (!pathname || pathname === current) return;
  previous = current;
  current = pathname;
}

/** 지금 화면으로 오기 직전의 앱 안 경로. 앱 밖에서 들어왔으면 null 이다. */
export function previousRoute(): string | null {
  return previous;
}

/**
 * 경로가 목록 경로 패턴에 맞는가. 기본은 정확히 같은 경로이고, `/*` 로 끝나면 그 하위 경로 전부다
 * (`/cop/cmy/selectCommunityDetail/*`). 목록과 상세가 같은 접두를 쓰는 경우(`/smart-toolkit/dept-job` 과
 * `/smart-toolkit/dept-job/12`)에 다른 상세에서 온 것을 목록에서 온 것으로 읽지 않게 기본을 정확 일치로 둔다.
 */
export function matchesRoute(pathname: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return pathname === pattern;
}

/** 테스트 격리용 — 기록을 비운다. */
export function resetRouteHistory(): void {
  current = null;
  previous = null;
}
