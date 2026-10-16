import { describe, expect, it } from 'vitest';

import { BOARD_TYPES, DEFAULT_BOARD_TYPE, boardTypeLabel, findBoardType } from '../board-types';

describe('게시판 유형 정본(GAP-BOARD-002, DEC-OPS-332)', () => {
  it('유형 코드와 템플릿은 서로 1:1 이다', () => {
    const codes = BOARD_TYPES.map((type) => type.code);
    const templates = BOARD_TYPES.map((type) => type.templateId);
    expect(new Set(codes).size).toBe(BOARD_TYPES.length);
    expect(new Set(templates).size).toBe(BOARD_TYPES.length);
    // 서버 DTO 의 @Size(max = 12) 와 tb_bbs_master.bbs_type_cd 길이(12) 안이다.
    expect(codes.every((code) => /^BBST\d{2}$/.test(code))).toBe(true);
    expect(BOARD_TYPES.every((type) => type.name.trim().length > 0)).toBe(true);
  });

  it('마법사의 기본값은 첫 유형(지식 허브)이다', () => {
    expect(DEFAULT_BOARD_TYPE).toEqual(expect.objectContaining({ code: 'BBST01', templateId: 'TMPLT_HUB', name: '지식 허브' }));
  });

  it('코드와 템플릿이 정본의 짝이면 이름을 보인다', () => {
    expect(boardTypeLabel('BBST04', 'TMPLT_QNA')).toBe('Professional Q&A');
    expect(boardTypeLabel('BBST01', 'TMPLT_HUB')).toBe('지식 허브');
  });

  it('짝이 다르면 이름을 지어내지 않고 저장된 코드를 그대로 보인다', () => {
    // 시드 질의응답 게시판(BBSMSTR_DDDDDDDDDDDD)은 BBST03 + TMPLT_QNA 다 — 코드만 보면 'Visual Gallery' 다.
    expect(boardTypeLabel('BBST03', 'TMPLT_QNA')).toBe('BBST03');
    // 시드 공지사항(BBSMSTR_AAAAAAAAAAAA)은 정본에 없는 템플릿을 쓴다.
    expect(boardTypeLabel('BBST01', 'TMPLAT_BOARD_DEFAULT')).toBe('BBST01');
    expect(boardTypeLabel('BBST01', undefined)).toBe('BBST01');
  });

  it('표에 없는 코드는 그대로, 코드가 없으면 빈 문자열이다', () => {
    expect(findBoardType('COM004')).toBeUndefined();
    expect(boardTypeLabel('LEGACY_TY', 'TMPLT_HUB')).toBe('LEGACY_TY');
    expect(boardTypeLabel(undefined, 'TMPLT_HUB')).toBe('');
    expect(boardTypeLabel(null, null)).toBe('');
  });
});
