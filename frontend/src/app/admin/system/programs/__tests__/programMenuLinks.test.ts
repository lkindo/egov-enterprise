import { describe, expect, it } from 'vitest';
import {
  PROGRAM_DELETE_GENERAL_NOTICE,
  createProgramMenuLinkLookup,
  programDeleteLinkNotice,
  programMenuLinkSummary,
  programMenuLinksFromMenus,
  programMenuLinksFromSource,
  type LinkedMenu,
  type ProgramMenuLinkCell,
} from '../programMenuLinks';

/**
 * 프로그램 ↔ 메뉴 연결 순수 계산(2026-10-02). 세는 규칙은 서버 삭제 거부(409, tb_menu_info.prgrm_file_nm 참조)와
 * 같다. [D3] 읽는 데이터도 같은 표(메뉴 구조 조회 — 캐시 없음)지만 화면을 연 시점의 값이라 최종 판정은 서버다.
 */
describe('programMenuLinksFromMenus', () => {
  it('프로그램을 연결한 메뉴만 남기고 사용 안 함 메뉴도 연결로 센다', () => {
    expect(programMenuLinksFromMenus([
      { menuNo: 1, menuNm: '루트', prgrmFileNm: null, useYn: 'Y' },
      { menuNo: 2, menuNm: '빈 연결', prgrmFileNm: '', useYn: 'Y' },
      { menuNo: 3, menuNm: '연결 없음 필드' },
      { menuNo: 4, menuNm: '프로그램 목록', prgrmFileNm: 'ProgramList', useYn: 'Y' },
      { menuNo: 5, menuNm: '옛 목록', prgrmFileNm: 'ProgramList', useYn: 'N' },
      { menuNo: 6, menuNm: '사용 여부 없음', prgrmFileNm: 'Other' },
    ])).toStrictEqual({
      status: 'loaded',
      links: [
        { menuNo: 4, menuNm: '프로그램 목록', prgrmFileNm: 'ProgramList', inUse: true },
        { menuNo: 5, menuNm: '옛 목록', prgrmFileNm: 'ProgramList', inUse: false },
        { menuNo: 6, menuNm: '사용 여부 없음', prgrmFileNm: 'Other', inUse: true },
      ],
    });
  });

  it('응답이 배열이 아니면 빈 연결로 위장하지 않고 실패로 둔다', () => {
    expect(programMenuLinksFromMenus(null)).toStrictEqual({ status: 'failed' });
    expect(programMenuLinksFromMenus(undefined)).toStrictEqual({ status: 'failed' });
  });
});

/*
 * [2026-10-02 D3] 메뉴 구조 출처(화면 목록과 나눠 쓰는 조회 한 번) → 연결 봉투. 확인 중·거부·실패는 그대로 넘기고
 * 0건으로 바꾸지 않는다(출처 상태 판정 자체는 menuStructureSource 테스트가 고정한다).
 */
describe('programMenuLinksFromSource', () => {
  it('불러온 메뉴 구조면 연결 봉투로 바꾼다', () => {
    expect(programMenuLinksFromSource({
      status: 'loaded',
      menus: [
        { menuNo: 4, menuNm: '프로그램 목록', upMenuSn: null, menuOrdr: 1, modernRoute: null, menuExpln: null, useYn: 'N', prgrmFileNm: 'ProgramList' },
        { menuNo: 5, menuNm: '화면', upMenuSn: null, menuOrdr: 2, modernRoute: '/admin', menuExpln: null, useYn: 'Y', prgrmFileNm: null },
      ],
    })).toStrictEqual({
      status: 'loaded',
      links: [{ menuNo: 4, menuNm: '프로그램 목록', prgrmFileNm: 'ProgramList', inUse: false }],
    });
  });

  it('확인 중·거부·실패는 그대로다 — 연결 없음(0건)으로 바뀌지 않는다', () => {
    expect(programMenuLinksFromSource({ status: 'checking' })).toStrictEqual({ status: 'checking' });
    expect(programMenuLinksFromSource({ status: 'forbidden' })).toStrictEqual({ status: 'forbidden' });
    expect(programMenuLinksFromSource({ status: 'failed' })).toStrictEqual({ status: 'failed' });
  });
});

describe('createProgramMenuLinkLookup', () => {
  const lookup = createProgramMenuLinkLookup({
    status: 'loaded',
    links: [
      { menuNo: 9, menuNm: '프로그램 목록', prgrmFileNm: 'ProgramList', inUse: true },
      { menuNo: 3, menuNm: '가 화면', prgrmFileNm: 'ProgramList', inUse: false },
      { menuNo: 2, menuNm: '가 화면', prgrmFileNm: 'ProgramList', inUse: true },
      { menuNo: 5, menuNm: '다른 화면', prgrmFileNm: 'Other', inUse: true },
    ],
  });

  it('파일명 정확 일치로 연결 메뉴를 이름 순(같으면 번호 순)으로 돌려준다', () => {
    const cell = lookup('ProgramList');
    expect(cell.kind).toBe('linked');
    expect(cell.kind === 'linked' && cell.menus.map((menu) => menu.menuNo)).toEqual([2, 3, 9]);
    expect(programMenuLinkSummary(cell)).toBe('연결 메뉴 3개');
  });

  it('서버 SQL 과 같이 대소문자·공백을 다듬지 않는다', () => {
    expect(lookup('programlist')).toStrictEqual({ kind: 'none' });
    expect(lookup(' ProgramList')).toStrictEqual({ kind: 'none' });
  });

  it('연결한 메뉴가 없으면 연결 없음이다', () => {
    const cell = lookup('Unused');
    expect(cell).toStrictEqual({ kind: 'none' });
    expect(programMenuLinkSummary(cell)).toBe('연결 없음');
  });

  it('메뉴를 불러오는 중이면 모든 행이 불러오는 중이다 — 연결 없음으로 말하지 않는다', () => {
    const checking = createProgramMenuLinkLookup({ status: 'checking' })('ProgramList');
    expect(checking).toStrictEqual({ kind: 'checking' });
    expect(programMenuLinkSummary(checking)).toBe('연결 메뉴를 불러오는 중…');
  });

  it('메뉴 조회가 거부·실패하면 모든 행이 그 상태다 — 연결 없음으로 바뀌지 않는다', () => {
    const forbidden = createProgramMenuLinkLookup({ status: 'forbidden' })('ProgramList');
    const failed = createProgramMenuLinkLookup({ status: 'failed' })('ProgramList');
    expect(forbidden).toStrictEqual({ kind: 'forbidden' });
    expect(failed).toStrictEqual({ kind: 'failed' });
    expect(programMenuLinkSummary(forbidden)).toBe('메뉴 조회 권한 없음');
    expect(programMenuLinkSummary(failed)).toBe('메뉴를 불러오지 못함');
  });
});

/*
 * 삭제 확인의 연결 안내(카탈로그 G10 — 명령은 레코드 상태를 반영한다). 연결이 확인된 행은 서버가 409 로 거부할
 * 것을 화면이 이미 알므로 메뉴 수·이름을 밝힌다. 화면을 연 시점의 메뉴 구조라 단정하지 않는다.
 * [D3] 화면에 없는 길(메뉴 관리에서 연결 해제)은 권하지 않는다 — 메뉴 구조 편집은 메뉴의 연결 프로그램을 바꾸지 않는다.
 */
describe('programDeleteLinkNotice', () => {
  const menu = (menuNo: number, menuNm: string): LinkedMenu => ({ menuNo, menuNm, prgrmFileNm: 'P', inUse: true });

  it('연결 메뉴를 알면 수와 이름을 싣는다', () => {
    const notice = programDeleteLinkNotice({ kind: 'linked', menus: [menu(1, '가 화면'), menu(2, '나 화면')] });
    expect(notice).toBe('불러온 메뉴 구조 기준으로 메뉴 2개(가 화면, 나 화면)가 이 프로그램을 연결하고 있습니다. '
      + '연결이 남아 있으면 삭제되지 않습니다.');
  });

  it('이름은 세 개까지 싣고 나머지는 수로 줄인다', () => {
    const notice = programDeleteLinkNotice({
      kind: 'linked',
      menus: [menu(1, '가'), menu(2, '나'), menu(3, '다'), menu(4, '라'), menu(5, '마')],
    });
    expect(notice).toContain('메뉴 5개(가, 나, 다 외 2개)');
    expect(notice).not.toContain('라');
  });

  it('연결을 모르거나 없으면 일반 안내다 — 연결이 있다고도 없다고도 단정하지 않는다', () => {
    expect(PROGRAM_DELETE_GENERAL_NOTICE).toBe('이 프로그램을 연결한 메뉴가 있으면 삭제되지 않습니다.');
    for (const cell of [{ kind: 'none' }, { kind: 'checking' }, { kind: 'forbidden' }, { kind: 'failed' }] as const) {
      expect(programDeleteLinkNotice(cell)).toBe(PROGRAM_DELETE_GENERAL_NOTICE);
    }
  });

  it('어떤 안내도 화면에 없는 길(메뉴 관리에서 연결 해제)을 권하지 않는다', () => {
    const cells: ProgramMenuLinkCell[] = [{ kind: 'none' }, { kind: 'linked', menus: [menu(1, '가')] }];
    for (const cell of cells) {
      expect(programDeleteLinkNotice(cell)).not.toMatch(/해제해 주세요|메뉴 관리에서/);
    }
  });
});
