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

/**
 * 비밀글 정책을 이 값으로 둘 때 함께 알아야 할 사실(ADR-0040 결정 7·§5.5). 없으면 빈 배열이다. 설정 탭이 정책 칸 아래와 저장 확인
 * 표 아래에 같은 문장을 쓴다.
 *  · FAQ 지정 게시판을 필수로 두면: 공개 FAQ 는 비밀글이 아닌 글만 싣는다 — 앞으로 저장하는 글(새 글과 고친 글)은 실리지 않는다.
 *  · 질의응답 게시판(QNA_BOARD_ID)을 없음 밖으로 두면: 도움말 1:1 문의(비밀)와 지식 허브 질의응답(공개)이 이 게시판을 함께 쓰는
 *    지금 동작이 의도라 없음으로 둔다(결정 7). 선택이면 작성 화면에 선택이 생기고, 필수면 공개 질문도 비밀글이 된다.
 */
export function privatePostPolicyWarnings(
  bbsId: string,
  designations: readonly string[] | null | undefined,
  policy: string | null | undefined,
): string[] {
  const warnings: string[] = [];
  if (policy === 'REQUIRED' && (designations ?? []).includes('FAQ')) {
    warnings.push('FAQ 지정 게시판입니다 — 공개 FAQ 는 비밀글이 아닌 글만 싣습니다. 필수로 두면 앞으로 저장하는 글(새 글과 고친 글)은 공개 FAQ 에 실리지 않습니다.');
  }
  if (bbsId === QNA_BOARD_ID && (policy === 'OPTIONAL' || policy === 'REQUIRED')) {
    warnings.push(policy === 'REQUIRED'
      ? '도움말 1:1 문의(비밀)와 지식 허브 질의응답(공개)이 이 게시판을 함께 씁니다. 필수로 두면 공개 질문도 앞으로 저장할 때 비밀글이 되어 다른 사용자에게 보이지 않습니다.'
      : '도움말 1:1 문의(비밀)와 지식 허브 질의응답(공개)이 이 게시판을 함께 씁니다. 선택으로 두면 게시글 작성 화면에 비밀글 선택이 생깁니다. 이 게시판은 없음으로 두는 것이 의도한 동작입니다.');
  }
  return warnings;
}

/** 지정 용도의 짧은 표지(목록·운영 화면 머리). */
export const DESIGNATION_LABELS: Readonly<Record<string, string>> = {
  NOTICE: '공지 지정',
  FAQ: 'FAQ 지정',
  TASK: '업무 홈',
};
