import { describe, expect, it } from 'vitest';

import { QNA_STATUS_LABELS, isQnaSolved, qnaCategoryLabel, qnaStatusLabel } from '../qna-status';

/**
 * [2026-10-26 ADR-0043 1차 OPS-02·UX-05] Q&A 상태 이름의 정본. 두 상태(OPEN/SOLVED)는 '해결로 표시했는가' 이지 답변이 달렸는가가
 * 아니다(DEC-OPS-137 ③) — OPEN 을 '답변 대기' 로 부르면 답이 달린 질문도 대기로 읽힌다. 화면마다 따로 이름을 두지 않는다.
 */
describe('Q&A 해결 상태 이름', () => {
  it('두 상태를 미해결 / 해결됨 으로 부른다', () => {
    expect(QNA_STATUS_LABELS).toEqual({ OPEN: '미해결', SOLVED: '해결됨' });
    expect(qnaStatusLabel('OPEN')).toBe('미해결');
    expect(qnaStatusLabel('SOLVED')).toBe('해결됨');
  });

  it.each([undefined, null, '', 'QA01', 'ANSWERED'])('값 도메인 밖(%s)은 해결을 지어내지 않고 미해결이다', (value) => {
    expect(qnaStatusLabel(value)).toBe('미해결');
    expect(isQnaSolved(value ?? undefined)).toBe(false);
  });

  it('어느 이름도 답변 여부를 말하지 않는다', () => {
    for (const label of Object.values(QNA_STATUS_LABELS)) expect(label).not.toMatch(/답변|접수|대기/);
  });
});

describe('Q&A 분류 이름', () => {
  it.each([undefined, null, '', 'CAT01', 'CAT99'])('분류 체계(C1)를 정하기 전에는 코드(%s)를 보이지 않고 일반이라 부른다', (value) => {
    expect(qnaCategoryLabel(value)).toBe('일반');
  });
});
