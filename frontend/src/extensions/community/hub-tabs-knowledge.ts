import { defineContributions } from '@/extensions/slots';
import { KNOWLEDGE_COMMUNITY_TAB_VIEW } from '@/components/business/community/knowledge-community-tab';

/**
 * 커뮤니티 → 지식 허브 탭 기여(허브 분해 H2). 지식 허브는 게시판 셸이고, 커뮤니티 기능이 빠진 구성에서는 이 파일이 기능과 함께
 * 직접 지워져 커뮤니티 탭과 그 머리 동작(목록·가입, 관리)만 사라진다. 탭 값(id)은 허브의 `?tab=` 값이며 허브 탭 해석
 * (knowledge-tabs.ts 의 contributable)이 이 파일을 지목한다. 뷰(게시판 ID·설명·머리 동작)는 커뮤니티 소유 모듈이 내보낸다.
 */
export default defineContributions('hub-tabs-knowledge', [
  {
    id: 'COMMUNITY',
    order: 40,
    label: '커뮤니티',
    view: KNOWLEDGE_COMMUNITY_TAB_VIEW,
    visibleWhen: { always: '종전 노출 보존 — 지식 허브 진입자에게 늘 보였고, 목록은 서버가 게시판 조회 권한으로 막는다.' },
  },
]);
