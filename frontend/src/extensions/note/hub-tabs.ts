import { defineContributions } from '@/extensions/slots';
import { NoteCollaborationTab } from '@/app/note/NoteCollaborationTab';

/**
 * 쪽지 → 협업 허브 탭 기여(허브 분해 H1). 협업 허브는 core 셸이고, 쪽지 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져
 * 쪽지 탭만 사라진다. 탭 값(id)은 허브의 `?tab=` 값이며 허브 탭 해석(collaboration-tabs.ts 의 contributable)이 이 파일을 지목한다.
 */
export default defineContributions('hub-tabs', [
  {
    id: 'MESSAGES',
    hub: 'collaboration',
    order: 10,
    label: '쪽지',
    view: { Component: NoteCollaborationTab },
    visibleWhen: { always: '종전 노출 보존 — 허브 진입자에게 늘 보였고, 목록은 서버가 쪽지 조회 권한으로 막는다.' },
  },
]);
