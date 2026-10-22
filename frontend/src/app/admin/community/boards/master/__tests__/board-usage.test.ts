import { describe, expect, it } from 'vitest';
import { QNA_BOARD_ID, TASK_BOARD_ID } from '@/config/board-ids';
import { boardUsageNotes } from '../board-usage';

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
