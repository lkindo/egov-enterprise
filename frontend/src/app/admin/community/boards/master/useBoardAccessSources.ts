'use client';

import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { useMenuAccessSources, type MenuAccessSources } from '@/lib/navigation/use-menu-access-sources';

export type BoardAccessSources = MenuAccessSources;

/**
 * 게시판 메뉴 연결 판정(ADR-0040 결정 8)이 읽는 두 원천 — 메뉴 구조(MENU_READ)와 그룹별 배정(AUTHRT_READ).
 *
 * 조회·권한·실패 판정은 공용 훅(useMenuAccessSources — ADR-0042 에서 콘텐츠 페이지와 함께 쓰려고 옮겼다)이 한다. 권한이 없으면
 * 조회를 보내지 않고(서버의 403 거부 기록을 남기지 않는다), 403 은 '확인 권한 없음', 그 밖의 실패는 '확인 불가' 다. 메뉴는
 * 화면을 열 때마다 다시 읽는다. 게시판 화면과 시험은 이 이름으로 부른다.
 */
export function useBoardAccessSources(): BoardAccessSources {
  const { user } = useAuth();
  return useMenuAccessSources({
    canReadMenus: canPermission(user, 'MENU_READ'),
    canReadGroups: canPermission(user, 'AUTHRT_READ'),
  });
}
