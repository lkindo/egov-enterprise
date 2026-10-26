import { describe, expect, it } from 'vitest';
import { QNA_BOARD_ID, TASK_BOARD_ID, WIKI_BOARD_ID } from '@/config/board-ids';
import {
  DESIGNATION_LABELS,
  boardAudience,
  boardAudienceNote,
  boardCommunityOf,
  boardUsageNotes,
  isHelpQnaBoard,
  menuSummaryLabel,
  privatePostPolicyWarnings,
} from '../board-usage';

/** 사용 안 함으로 바꾸기 전에 알리는 사용처 문장(ADR-0040 §5.2·§5.5). 앱이 ID 로 직접 쓰는 곳을 사실대로 말한다. */
describe('boardUsageNotes', () => {
  // [2026-10-26 ADR-0043 결정 4] Q&A·위키도 서버 지정 용도다 — 서버 값을 알면 그 값으로 말한다.
  it('Q&A 지정 게시판은 도움말 센터와 허브 질의응답 탭을 한 문장으로 알리고, 화면 상수로 다시 말하지 않는다', () => {
    expect(boardUsageNotes(QNA_BOARD_ID, ['QNA'])).toEqual([
      'Q&A 지정 게시판입니다 — 도움말 센터의 질의응답 목록·1:1 문의와 지식 허브 질의응답(Q&A) 탭이 이 게시판을 씁니다.',
    ]);
  });

  it('위키 지정 게시판은 허브 위키 탭을 한 번만 알린다', () => {
    expect(boardUsageNotes(WIKI_BOARD_ID, ['WIKI'])).toEqual(['위키 지정 게시판입니다 — 지식 허브 위키 탭이 이 게시판을 보입니다.']);
  });

  it('서버가 지정하지 않았다고 알리면 화면 상수의 Q&A·위키 대응으로 말하지 않는다(서버 설정이 정본)', () => {
    expect(boardUsageNotes(QNA_BOARD_ID, [])).toEqual([]);
    expect(boardUsageNotes(WIKI_BOARD_ID, [])).toEqual([]);
  });

  it('서버 값을 모르면 화면 상수로 도움말 센터와 허브 탭을 알린다', () => {
    const notes = boardUsageNotes(QNA_BOARD_ID, null);
    expect(notes).toContain('지식 허브의 질의응답(Q&A) 탭이 이 게시판을 보입니다.');
    expect(notes).toContain('도움말 센터의 질의응답 목록과 1:1 문의가 이 게시판을 씁니다.');
  });

  // 커뮤니티 탭의 게시판은 core 업무 게시판이라 커뮤니티 없는 구성에도 남는다 — 기여 탭은 조건을 붙여 말한다.
  it('기여 탭(커뮤니티)은 그 기능을 넣은 구성에서라고 조건을 붙이고, 지정 용도 문장은 그대로 둔다', () => {
    const notes = boardUsageNotes(TASK_BOARD_ID, ['TASK']);
    expect(notes[0]).toBe('업무 게시판 지정입니다 — 업무 홈 업무 카드가 이 게시판을 보입니다.');
    expect(notes).toContain('지식 허브의 커뮤니티 탭이 이 게시판을 보입니다(커뮤니티 기능을 넣은 구성에서).');
    expect(notes.some((note) => note.includes('도움말 센터'))).toBe(false);
  });

  it('앱이 직접 쓰지 않는 게시판은 사용처가 없다', () => {
    expect(boardUsageNotes('BBSMSTR_ZZZZZZZZZZZZ', [])).toEqual([]);
    expect(boardUsageNotes('BBSMSTR_ZZZZZZZZZZZZ', null)).toEqual([]);
  });

  it('지정 용도 표지는 다섯 용도 모두에 있다', () => {
    expect(DESIGNATION_LABELS).toMatchObject({ QNA: 'Q&A·1:1 문의', WIKI: '지식 허브 위키' });
    expect(Object.keys(DESIGNATION_LABELS).sort()).toEqual(['FAQ', 'NOTICE', 'QNA', 'TASK', 'WIKI']);
  });
});

describe('isHelpQnaBoard', () => {
  it('서버 값이 있으면 그 값으로, 없으면 화면 상수로 판정한다', () => {
    expect(isHelpQnaBoard('BBSMSTR_ANYBOARD0001', ['QNA'])).toBe(true);
    expect(isHelpQnaBoard(QNA_BOARD_ID, [])).toBe(false);
    expect(isHelpQnaBoard(QNA_BOARD_ID, undefined)).toBe(true);
    expect(isHelpQnaBoard('BBSMSTR_ANYBOARD0001', null)).toBe(false);
  });
});

/**
 * 비밀글 정책의 경고(ADR-0040 결정 7·§5.5). FAQ 지정 게시판을 필수로 두면 공개 FAQ 에서 빠지고, Q&A 게시판은 1:1 문의(비밀)와
 * 공개 질문이 함께 있어 없음으로 두는 것이 의도다. 그 밖의 조합은 말하지 않는다.
 */
describe('privatePostPolicyWarnings', () => {
  it('FAQ 지정 게시판을 필수로 두면 공개 FAQ 에서 빠진다고 말한다', () => {
    expect(privatePostPolicyWarnings('BBSMSTR_FAQFAQFAQFAQ', ['FAQ'], 'REQUIRED')).toEqual([
      'FAQ 지정 게시판입니다 — 공개 FAQ 는 비밀글이 아닌 글만 싣습니다. 필수로 두면 앞으로 저장하는 글(새 글과 고친 글)은 공개 FAQ 에 실리지 않습니다.',
    ]);
    // 선택은 글쓴이가 고른 글만 비밀이 된다 — 공개 FAQ 경고 대상이 아니다.
    expect(privatePostPolicyWarnings('BBSMSTR_FAQFAQFAQFAQ', ['FAQ'], 'OPTIONAL')).toEqual([]);
    expect(privatePostPolicyWarnings('BBSMSTR_FAQFAQFAQFAQ', ['FAQ'], 'NONE')).toEqual([]);
  });

  it('Q&A 지정 게시판을 없음 밖으로 두면 함께 쓰는 두 화면을 알리고, 없음이면 말하지 않는다', () => {
    const required = privatePostPolicyWarnings(QNA_BOARD_ID, ['QNA'], 'REQUIRED');
    expect(required).toHaveLength(1);
    expect(required[0]).toContain('도움말 1:1 문의(비밀)와 지식 허브 질의응답(공개)이 이 게시판을 함께 씁니다.');
    expect(required[0]).toContain('공개 질문도 앞으로 저장할 때 비밀글이 되어');
    const optional = privatePostPolicyWarnings(QNA_BOARD_ID, ['QNA'], 'OPTIONAL');
    expect(optional).toHaveLength(1);
    expect(optional[0]).toContain('게시글 작성 화면에 비밀글 선택이 생깁니다');
    expect(privatePostPolicyWarnings(QNA_BOARD_ID, ['QNA'], 'NONE')).toEqual([]);
  });

  // [ADR-0043 결정 4] 새로 만든 질의응답형 게시판(화면 유형만 Q&A)은 1:1 문의를 겸하지 않는다 — 서버가 Q&A 로 지정한 게시판만 경고한다.
  it('서버가 Q&A 로 지정하지 않은 게시판은 화면 상수와 같은 ID 여도 경고하지 않는다', () => {
    expect(privatePostPolicyWarnings(QNA_BOARD_ID, [], 'REQUIRED')).toEqual([]);
    expect(privatePostPolicyWarnings('BBSMSTR_ANYBOARD0001', ['QNA'], 'OPTIONAL')).toHaveLength(1);
  });

  it('지정·Q&A 게시판이 아니거나 정책을 모르면 말하지 않는다', () => {
    expect(privatePostPolicyWarnings('BBSMSTR_ZZZZZZZZZZZZ', ['NOTICE'], 'REQUIRED')).toEqual([]);
    expect(privatePostPolicyWarnings(QNA_BOARD_ID, null, undefined)).toEqual([]);
  });
});

/** 이용 범위(ADR-0043, G4·G5) — 게시판별로 이용자를 나누는 수단은 커뮤니티 귀속 하나뿐이다. */
describe('이용 범위', () => {
  it('귀속이 없으면 전체, 귀속이면 커뮤니티 이름의 회원이다', () => {
    expect(boardAudience(null)).toEqual({ kind: 'all', label: '전체' });
    const inUse = boardAudience({ cmntySn: 7, cmntyNm: '개발 모임', inUse: true });
    expect(inUse).toEqual({ kind: 'community', label: '‘개발 모임’ 커뮤니티 회원', state: 'in-use' });
    expect(boardAudienceNote(inUse)).toBeNull();
  });

  it('커뮤니티가 사용 중지면 입구가 없다고 경고하고, 모르면 확인 불가다', () => {
    expect(boardAudienceNote(boardAudience({ cmntySn: 7, cmntyNm: '개발 모임', inUse: false })))
      .toBe('커뮤니티 사용 중지 — 이용자가 들어갈 입구가 없습니다');
    const unknown = boardAudience({ cmntySn: 7, cmntyNm: null, inUse: null });
    expect(unknown).toEqual({ kind: 'community', label: '커뮤니티 회원', state: 'unknown' });
    expect(boardAudienceNote(unknown)).toBe('커뮤니티 확인 불가');
  });

  it('귀속 번호만 있고 요약이 없으면 모르는 귀속이다 — 귀속이 없다고 추정하지 않는다', () => {
    expect(boardCommunityOf({ cmntySn: 7 })).toEqual({ cmntySn: 7, cmntyNm: null, inUse: null });
    expect(boardCommunityOf({ cmntySn: 7, community: { cmntySn: 7, cmntyNm: '개발 모임', inUse: true } }))
      .toEqual({ cmntySn: 7, cmntyNm: '개발 모임', inUse: true });
    expect(boardCommunityOf({})).toBeNull();
  });
});

describe('메뉴 상태 요약 표지', () => {
  it('요약마다 이름이 있다', () => {
    expect(menuSummaryLabel({ kind: 'general', count: 2 })).toBe('일반 그룹 표시 2');
    expect(menuSummaryLabel({ kind: 'admin-only' })).toBe('관리자 그룹만');
    expect(menuSummaryLabel({ kind: 'inactive' })).toBe('비활성');
    expect(menuSummaryLabel({ kind: 'none' })).toBe('연결 없음');
    expect(menuSummaryLabel({ kind: 'unknown' })).toBe('확인 불가');
    expect(menuSummaryLabel({ kind: 'no-permission' })).toBe('확인 권한 없음');
    expect(menuSummaryLabel({ kind: 'hidden' })).toBe('보이는 그룹 없음');
  });
});
