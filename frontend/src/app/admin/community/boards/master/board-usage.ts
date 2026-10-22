import { KNOWLEDGE_CONTRIBUTED_TAB_BOARDS, knowledgeTabsForBoard } from '@/app/admin/help/knowledge-tab-boards';
import { QNA_BOARD_ID } from '@/config/board-ids';

/**
 * 앱이 ID 로 직접 쓰는 게시판의 사용처(ADR-0040 §5.2·§5.5). 지정 용도는 서버가 설정(nuri.boards.*)으로 계산해 싣고, 지식 허브 탭
 * 대응은 허브와 같은 대응표에서 계산한다. 사용 안 함으로 바꾸기 전 확인과 설정 탭의 고정 제약이 같은 문장을 쓴다.
 */
const DESIGNATION_NOTES: Readonly<Record<string, string>> = {
  NOTICE: '공지 지정 게시판입니다 — 업무 홈 공지 카드가 이 게시판을 보이고, 글을 쓰려면 공지 편집 권한(NOTICE_EDIT)이 필요합니다.',
  FAQ: 'FAQ 지정 게시판입니다 — 공개 FAQ 가 이 게시판의 비밀글이 아닌 글을 싣고(로그인 필요), 글을 쓰려면 FAQ 편집 권한(FAQ_EDIT)이 필요합니다.',
  TASK: '업무 게시판 지정입니다 — 업무 홈 업무 카드가 이 게시판을 보입니다.',
};

const KNOWLEDGE_TAB_LABELS: Readonly<Record<string, string>> = {
  WIKI: '위키',
  FAQ: '자주 묻는 질문',
  QNA: '질의응답(Q&A)',
  COMMUNITY: '커뮤니티',
};

/**
 * 이 게시판의 사용처 문장. 없으면 빈 배열이다.
 *
 * 기여 탭(커뮤니티)은 그 기능을 넣은 구성에만 있다 — 이 모듈은 기능 파일을 import 하지 않으므로(관리 화면 번들에 탭 뷰를 싣지
 * 않는다) 구성을 모른 채 사실대로 조건을 붙여 말한다. 커뮤니티 탭의 게시판은 core 업무 게시판이라 커뮤니티 없는 구성에도 있다.
 */
export function boardUsageNotes(bbsId: string, designations: readonly string[] | null | undefined): string[] {
  const notes = (designations ?? []).map((designation) => DESIGNATION_NOTES[designation]).filter((note): note is string => !!note);
  for (const tab of knowledgeTabsForBoard(bbsId)) {
    const label = KNOWLEDGE_TAB_LABELS[tab] ?? tab;
    notes.push(tab in KNOWLEDGE_CONTRIBUTED_TAB_BOARDS
      ? `지식 허브의 ${label} 탭이 이 게시판을 보입니다(${label} 기능을 넣은 구성에서).`
      : `지식 허브의 ${label} 탭이 이 게시판을 보입니다.`);
  }
  // 도움말 센터는 지정 용도(nuri.boards.*)가 아니라 화면 상수로 이 게시판을 쓴다(HelpUserService).
  if (bbsId === QNA_BOARD_ID) notes.push('도움말 센터의 질의응답 목록과 1:1 문의가 이 게시판을 씁니다.');
  return notes;
}

/** 지정 용도의 짧은 표지(목록·운영 화면 머리). */
export const DESIGNATION_LABELS: Readonly<Record<string, string>> = {
  NOTICE: '공지 지정',
  FAQ: 'FAQ 지정',
  TASK: '업무 홈',
};
