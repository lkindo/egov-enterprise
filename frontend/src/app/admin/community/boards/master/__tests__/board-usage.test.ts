import { describe, expect, it } from 'vitest';
import { QNA_BOARD_ID, TASK_BOARD_ID } from '@/config/board-ids';
import { boardUsageNotes, privatePostPolicyWarnings } from '../board-usage';

/** 사용 안 함으로 바꾸기 전에 알리는 사용처 문장(ADR-0040 §5.2·§5.5). 앱이 ID 로 직접 쓰는 곳을 사실대로 말한다. */
describe('boardUsageNotes', () => {
  it('도움말 센터가 화면 상수로 쓰는 질의응답 게시판을 알린다', () => {
    const notes = boardUsageNotes(QNA_BOARD_ID, []);
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
});

/**
 * 비밀글 정책의 경고(ADR-0040 결정 7·§5.5). FAQ 지정 게시판을 필수로 두면 공개 FAQ 에서 빠지고, 질의응답 게시판은 1:1 문의(비밀)와
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

  it('질의응답 게시판을 없음 밖으로 두면 함께 쓰는 두 화면을 알리고, 없음이면 말하지 않는다', () => {
    const required = privatePostPolicyWarnings(QNA_BOARD_ID, [], 'REQUIRED');
    expect(required).toHaveLength(1);
    expect(required[0]).toContain('도움말 1:1 문의(비밀)와 지식 허브 질의응답(공개)이 이 게시판을 함께 씁니다.');
    expect(required[0]).toContain('공개 질문도 앞으로 저장할 때 비밀글이 되어');
    const optional = privatePostPolicyWarnings(QNA_BOARD_ID, [], 'OPTIONAL');
    expect(optional).toHaveLength(1);
    expect(optional[0]).toContain('게시글 작성 화면에 비밀글 선택이 생깁니다');
    expect(privatePostPolicyWarnings(QNA_BOARD_ID, [], 'NONE')).toEqual([]);
  });

  it('지정·질의응답이 아닌 게시판이나 정책을 모르면 말하지 않는다', () => {
    expect(privatePostPolicyWarnings('BBSMSTR_ZZZZZZZZZZZZ', ['NOTICE'], 'REQUIRED')).toEqual([]);
    expect(privatePostPolicyWarnings(QNA_BOARD_ID, null, undefined)).toEqual([]);
  });
});
