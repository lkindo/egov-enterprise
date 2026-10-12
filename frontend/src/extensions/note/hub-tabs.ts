import { defineContributions } from '@/extensions/slots';
import { NoteCollaborationTab } from '@/app/note/NoteCollaborationTab';

/**
 * 쪽지 → 협업 허브 탭 기여(허브 분해 H1). 협업 허브는 core 셸이고, 쪽지 기능이 빠진 구성에서는 이 파일이 기능과 함께 직접 지워져
 * 쪽지 탭만 사라진다. 탭 값(id)은 허브의 `?tab=` 값이며 허브 탭 해석(collaboration-tabs.ts 의 contributable)이 이 파일을 지목한다.
 *
 * 노출은 탭이 부르는 받은 쪽지 목록 API 와 같은 권한(NOTE_READ)이다(허브 분해 H5). 그 권한이 없으면 탭이 없고 `?tab=MESSAGES` 는
 * 허브의 다른 탭을 연다 — 종전에는 탭이 보였고 목록이 403 이었다. 기본 그룹은 화면이 같다. 노출일 뿐 인가는 서버가 한다(H3).
 */
export default defineContributions('hub-tabs', [
  {
    id: 'MESSAGES',
    hub: 'collaboration',
    order: 10,
    label: '쪽지',
    view: { Component: NoteCollaborationTab },
    visibleWhen: { permissions: ['NOTE_READ'] },
  },
]);
