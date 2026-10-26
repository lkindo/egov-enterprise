import { describe, expect, it } from 'vitest';

import {
  BOARD_TYPES,
  DEFAULT_BOARD_TYPE,
  DEFAULT_LAYOUT_NAME,
  boardTemplateName,
  boardTypeDisplay,
  boardTypeLabel,
  findBoardType,
  findBoardTypeByTemplate,
} from '../board-types';

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

  it('표에 없는 코드·템플릿은 정본 항목이 없다', () => {
    expect(findBoardType('COM004')).toBeUndefined();
    expect(findBoardTypeByTemplate('TMPLAT_BOARD_DEFAULT')).toBeUndefined();
    expect(findBoardTypeByTemplate('TMPLT_QNA')?.code).toBe('BBST04');
  });
});

/**
 * [2026-10-26 ADR-0043 결정 5] 화면 유형 이름은 실제 화면을 정하는 템플릿으로 정한다. 유형 코드와 템플릿이 정본의 짝이 아니면
 * 이름은 그대로 두고 짝 불일치를 따로 알린다(DEC-OPS-332 ② 대체).
 */
describe('화면 유형 이름 — 템플릿 기준(ADR-0043 결정 5)', () => {
  it('코드와 템플릿이 정본의 짝이면 이름만이고 불일치가 아니다', () => {
    expect(boardTypeDisplay('BBST04', 'TMPLT_QNA')).toEqual({ name: 'Professional Q&A', pairMismatch: false, storedCode: 'BBST04' });
    expect(boardTypeLabel('BBST01', 'TMPLT_HUB')).toBe('지식 허브');
  });

  it('짝이 다르면 템플릿의 이름을 보이고 짝 불일치를 알린다 — 코드의 이름을 붙이지 않는다', () => {
    // 시드 질의응답 게시판(BBSMSTR_DDDDDDDDDDDD)은 BBST03 + TMPLT_QNA 다 — 코드만 보면 갤러리다.
    expect(boardTypeDisplay('BBST03', 'TMPLT_QNA')).toEqual({ name: 'Professional Q&A', pairMismatch: true, storedCode: 'BBST03' });
    expect(boardTypeLabel('BBST03', 'TMPLT_QNA')).not.toBe(findBoardType('BBST03')?.name);
    // 시드 일정 게시판(위키 탭)은 BBST03 + TMPLT_CALENDAR 다.
    expect(boardTypeLabel('BBST03', 'TMPLT_CALENDAR')).toBe('Event Calendar');
  });

  it('내장 레이아웃이 아닌 템플릿·템플릿 없음은 기본 목록형(레이아웃 미지정)이고 짝 불일치다', () => {
    // 시드 공지사항·업무게시판(BBSMSTR_AAAA·CCCC)은 정본에 없는 템플릿을 쓴다 — 이용 화면은 기본 목록으로 그린다.
    expect(DEFAULT_LAYOUT_NAME).toBe('기본 목록형(레이아웃 미지정)');
    expect(boardTypeDisplay('BBST01', 'TMPLAT_BOARD_DEFAULT')).toEqual({ name: DEFAULT_LAYOUT_NAME, pairMismatch: true, storedCode: 'BBST01' });
    expect(boardTypeDisplay('BBST01', undefined)).toEqual({ name: DEFAULT_LAYOUT_NAME, pairMismatch: true, storedCode: 'BBST01' });
    expect(boardTemplateName(null)).toBe(DEFAULT_LAYOUT_NAME);
  });

  it('표에 없는 코드나 빈 코드는 짝 불일치이고 이름은 템플릿이 정한다', () => {
    expect(boardTypeDisplay('LEGACY_TY', 'TMPLT_HUB')).toEqual({ name: '지식 허브', pairMismatch: true, storedCode: 'LEGACY_TY' });
    expect(boardTypeDisplay(undefined, 'TMPLT_HUB')).toEqual({ name: '지식 허브', pairMismatch: true, storedCode: '' });
    expect(boardTypeLabel(null, null)).toBe(DEFAULT_LAYOUT_NAME);
  });

  it('마법사가 쓰는 템플릿 이름은 정본 표의 이름 그대로다', () => {
    for (const type of BOARD_TYPES) expect(boardTemplateName(type.templateId)).toBe(type.name);
  });
});
