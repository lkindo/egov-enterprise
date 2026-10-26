import { KNOWLEDGE_CONTRIBUTED_TAB_BOARDS, knowledgeTabsForBoard } from '@/app/admin/help/knowledge-tab-boards';
import { QNA_BOARD_ID } from '@/config/board-ids';
import type { BoardCommunityInput, BoardMenuSummary } from '@/lib/board/board-menu-links';

/**
 * 앱이 ID 로 직접 쓰는 게시판의 사용처(ADR-0040 §5.2·§5.5). 지정 용도는 서버가 설정(nuri.boards.*)으로 계산해 싣고, 지식 허브 탭
 * 대응은 허브와 같은 대응표에서 계산한다. 사용 안 함으로 바꾸기 전 확인과 설정 탭의 고정 제약이 같은 문장을 쓴다.
 *
 * [2026-10-26 ADR-0043 결정 4] 지정 용도에 Q&A·위키가 더해졌다(nuri.boards.qna-id·wiki-id). 서버가 지정 용도를 알려 주면 Q&A·위키는
 * 서버 값으로 말한다 — 화면 상수(QNA_BOARD_ID·허브 위키·질의응답 탭 대응)는 서버 값을 모를 때만 쓴다. 기관이 환경별로 바꾼 값은
 * 서버 설정이 정본이다(화면 상수와 서버 기본값이 같은지는 board-option-source 계약이 대조한다).
 */
const DESIGNATION_NOTES: Readonly<Record<string, string>> = {
  NOTICE: '공지 지정 게시판입니다 — 업무 홈 공지 카드가 이 게시판을 보이고, 글을 쓰려면 공지 편집 권한(NOTICE_EDIT)이 필요합니다.',
  FAQ: 'FAQ 지정 게시판입니다 — 공개 FAQ 가 이 게시판의 비밀글이 아닌 글을 싣고(로그인 필요), 글을 쓰려면 FAQ 편집 권한(FAQ_EDIT)이 필요합니다.',
  TASK: '업무 게시판 지정입니다 — 업무 홈 업무 카드가 이 게시판을 보입니다.',
  QNA: 'Q&A 지정 게시판입니다 — 도움말 센터의 질의응답 목록·1:1 문의와 지식 허브 질의응답(Q&A) 탭이 이 게시판을 씁니다.',
  WIKI: '위키 지정 게시판입니다 — 지식 허브 위키 탭이 이 게시판을 보입니다.',
};

/** 서버 지정 용도가 말하는 허브 탭 — 서버 값을 알면 이 탭은 화면 상수로 다시 말하지 않는다. */
const DESIGNATED_HUB_TABS: ReadonlySet<string> = new Set(['QNA', 'WIKI']);

const KNOWLEDGE_TAB_LABELS: Readonly<Record<string, string>> = {
  WIKI: '위키',
  FAQ: '자주 묻는 질문',
  QNA: '질의응답(Q&A)',
  COMMUNITY: '커뮤니티',
};

/** 지식 허브 탭의 이름(모르는 탭은 값 그대로). */
export function knowledgeTabLabel(tab: string): string {
  return KNOWLEDGE_TAB_LABELS[tab] ?? tab;
}

/**
 * 도움말 1:1 문의와 지식 허브 질의응답이 함께 쓰는 Q&A 게시판인가. 서버가 지정 용도를 알려 주면(빈 배열 포함) 그 값으로, 모르면
 * 화면 상수(QNA_BOARD_ID)로 판정한다. 설정 탭의 비밀글 경고·고정 제약이 같은 판정을 쓴다.
 */
export function isHelpQnaBoard(bbsId: string, designations: readonly string[] | null | undefined): boolean {
  return designations != null ? designations.includes('QNA') : bbsId === QNA_BOARD_ID;
}

/**
 * 이 게시판의 사용처 문장. 없으면 빈 배열이다.
 *
 * 기여 탭(커뮤니티)은 그 기능을 넣은 구성에만 있다 — 이 모듈은 기능 파일을 import 하지 않으므로(관리 화면 번들에 탭 뷰를 싣지
 * 않는다) 구성을 모른 채 사실대로 조건을 붙여 말한다. 커뮤니티 탭의 게시판은 core 업무 게시판이라 커뮤니티 없는 구성에도 있다.
 */
export function boardUsageNotes(bbsId: string, designations: readonly string[] | null | undefined): string[] {
  const known = designations != null;
  const notes = (designations ?? []).map((designation) => DESIGNATION_NOTES[designation]).filter((note): note is string => !!note);
  for (const tab of knowledgeTabsForBoard(bbsId)) {
    // [ADR-0043 결정 4] Q&A·위키 탭은 서버 지정 용도가 말한다(위 문장) — 서버 값을 알면 화면 상수로 다시 말하지 않는다.
    if (known && DESIGNATED_HUB_TABS.has(tab)) continue;
    const label = knowledgeTabLabel(tab);
    notes.push(tab in KNOWLEDGE_CONTRIBUTED_TAB_BOARDS
      ? `지식 허브의 ${label} 탭이 이 게시판을 보입니다(${label} 기능을 넣은 구성에서).`
      : `지식 허브의 ${label} 탭이 이 게시판을 보입니다.`);
  }
  // 서버 값을 모를 때만 도움말 센터의 화면 상수로 판정한다(HelpUserService). 서버 값이 있으면 Q&A 지정 문장이 말한다.
  if (!known && bbsId === QNA_BOARD_ID) notes.push('도움말 센터의 질의응답 목록과 1:1 문의가 이 게시판을 씁니다.');
  return notes;
}

/**
 * 비밀글 정책을 이 값으로 둘 때 함께 알아야 할 사실(ADR-0040 결정 7·§5.5). 없으면 빈 배열이다. 설정 탭이 정책 칸 아래와 저장 확인
 * 표 아래에 같은 문장을 쓴다.
 *  · FAQ 지정 게시판을 필수로 두면: 공개 FAQ 는 비밀글이 아닌 글만 싣는다 — 앞으로 저장하는 글(새 글과 고친 글)은 실리지 않는다.
 *  · Q&A 게시판(isHelpQnaBoard)을 없음 밖으로 두면: 도움말 1:1 문의(비밀)와 지식 허브 질의응답(공개)이 이 게시판을 함께 쓰는
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
  if (isHelpQnaBoard(bbsId, designations) && (policy === 'OPTIONAL' || policy === 'REQUIRED')) {
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
  QNA: 'Q&A·1:1 문의',
  WIKI: '지식 허브 위키',
};

/** 업무 홈 카드 이름(지정 용도 공지·업무). */
export const HOME_CARD_LABELS: Readonly<Record<string, string>> = {
  NOTICE: '업무 홈 공지 카드',
  TASK: '업무 홈 업무 카드',
};

/**
 * 게시판이 귀속된 커뮤니티(ADR-0043 결정 3). 귀속이 없으면 null 이다. 서버가 귀속 번호(cmntySn)만 싣고 요약을 싣지 않았으면 이름·
 * 이용 가능 여부를 모르는 귀속으로 둔다 — 귀속이 없다고 추정하지 않는다.
 */
export function boardCommunityOf(board: { cmntySn?: number | null; community?: BoardCommunityInput | null }): BoardCommunityInput | null {
  if (board.community) return board.community;
  return board.cmntySn != null ? { cmntySn: board.cmntySn, cmntyNm: null, inUse: null } : null;
}

/**
 * 이용 범위(ADR-0043, G4·G5). 게시판별로 이용자를 나누는 수단은 커뮤니티 귀속 하나뿐이다.
 *  · 귀속 없음: 전체(게시글 권한이 있는 로그인 사용자).
 *  · 귀속: 그 커뮤니티의 승인 회원. 커뮤니티가 사용 중지면 입구가 없다고 경고하고, 커뮤니티를 알 수 없으면 확인 불가다.
 */
export type BoardAudience =
  | { kind: 'all'; label: string }
  | { kind: 'community'; label: string; state: 'in-use' | 'stopped' | 'unknown' };

export function boardAudience(community: BoardCommunityInput | null): BoardAudience {
  if (community === null) return { kind: 'all', label: '전체' };
  const name = community.cmntyNm?.trim();
  const label = name ? `‘${name}’ 커뮤니티 회원` : '커뮤니티 회원';
  const state = community.inUse === true ? 'in-use' : community.inUse === false ? 'stopped' : 'unknown';
  return { kind: 'community', label, state };
}

/** 이용 범위의 보조 문구 — 사용 중지·확인 불가일 때만 있다. */
export function boardAudienceNote(audience: BoardAudience): string | null {
  if (audience.kind !== 'community') return null;
  if (audience.state === 'stopped') return '커뮤니티 사용 중지 — 이용자가 들어갈 입구가 없습니다';
  if (audience.state === 'unknown') return '커뮤니티 확인 불가';
  return null;
}

/** 메뉴 상태 요약 표지(목록의 메뉴 연결 칸 위·운영 화면 머리). summarizeBoardMenuLinks 의 결과를 이름으로. */
export function menuSummaryLabel(summary: BoardMenuSummary): string {
  switch (summary.kind) {
    case 'general': return `일반 그룹 표시 ${summary.count.toLocaleString()}`;
    case 'admin-only': return '관리자 그룹만';
    case 'hidden': return '보이는 그룹 없음';
    case 'inactive': return '비활성';
    case 'none': return '연결 없음';
    case 'no-permission': return '확인 권한 없음';
    case 'unknown': return '확인 불가';
  }
}
