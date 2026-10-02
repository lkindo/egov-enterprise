import { describe, expect, it } from 'vitest';
import type { MenuMissingEntryPermission } from '@/lib/auth/navigation-permission-tree';
import { PROTECTED_PERMISSIONS } from '@/types/generated-screen-registry';
import {
  buildOperationMatrix,
  changedOperationKeys,
  isSaveShortcut,
  matrixRowMatches,
  nextCellPosition,
  planBulkToggle,
  planEntryFixes,
  PROTECTED_PERMISSION_CODES,
} from '../components/operation-permission-matrix-model';

const op = (code: string, name = code) => {
  const [domain, ...rest] = code.split(':');
  return { code: `${domain}_${rest.join('_')}`, domain, action: rest.join('_'), name };
};
const key = (code: string) => `OPERATION:${code}`;

describe('기능별 권한 표 모델', () => {
  it('분류 순서·분류 안 영역 순서로 행을 묶고, 표에 없는 영역은 기타에 카탈로그 순서로 둔다', () => {
    const matrix = buildOperationMatrix([
      op('ZETA:READ'), op('MENU:READ'), op('BOARD:READ'), op('ALPHA:READ'), op('NOTE:READ'), op('DASHBOARD:READ'),
    ]);
    expect(matrix.map((category) => [category.label, category.rows.map((row) => row.domain)])).toEqual([
      ['내 업무·결재', ['DASHBOARD']],
      ['소통·연락', ['NOTE']],
      ['게시·지식·커뮤니티', ['BOARD']],
      ['시스템 설정', ['MENU']],
      ['기타', ['ZETA', 'ALPHA']],
    ]);
  });

  it('고정 열 밖의 행위와 중복된 행위는 그 밖의 기능에 남겨 어떤 권한도 사라지지 않게 한다', () => {
    const [category] = buildOperationMatrix([
      op('BOARD:READ'), op('BOARD:LIKE'), op('BOARD:DELETE_ALL'), { code: 'BOARD_READ_DUP', domain: 'BOARD', action: 'READ', name: '중복' },
    ]);
    const [row] = category.rows;
    expect(row.columns.map((cell) => cell?.code ?? null)).toEqual(['BOARD_READ', null, null, null, null, null, 'BOARD_DELETE_ALL']);
    expect(row.others.map((cell) => cell.code)).toEqual(['BOARD_LIKE', 'BOARD_READ_DUP']);
    expect(row.operations).toHaveLength(4);
  });

  it('기능 검색은 영역 라벨·영역 코드·권한 코드·권한 이름으로 행을 거른다', () => {
    const [category] = buildOperationMatrix([op('BOARD:READ', '게시글 조회'), op('BOARD:LIKE', '게시글 추천')]);
    const [row] = category.rows;
    for (const query of ['게시글', 'board', 'BOARD_LIKE', '추천', '  ']) expect(matrixRowMatches(row, query)).toBe(true);
    expect(matrixRowMatches(row, '메뉴')).toBe(false);
  });

  it('일괄 선택은 비보호 칸만 다루고, 모두 켜져 있으면 해제한다', () => {
    const scope = [op('AUTHRT:READ'), op('AUTHRT:GRANT'), op('AUTHRT:ASSIGN'), op('AUTHRT:AUDIT')];
    expect(planBulkToggle(scope, new Set(), true)).toEqual({ mode: 'select', keys: [key('AUTHRT_READ'), key('AUTHRT_AUDIT')] });
    expect(planBulkToggle(scope, new Set([key('AUTHRT_READ')]), true)).toEqual({ mode: 'select', keys: [key('AUTHRT_AUDIT')] });
    // 보호 권한이 꺼져 있어도 비보호 칸이 모두 켜져 있으면 해제다 — 보호 권한은 건드리지 않는다.
    expect(planBulkToggle(scope, new Set([key('AUTHRT_READ'), key('AUTHRT_AUDIT'), key('AUTHRT_GRANT')]), true))
      .toEqual({ mode: 'clear', keys: [key('AUTHRT_READ'), key('AUTHRT_AUDIT')] });
    expect(planBulkToggle([op('AUTHRT:GRANT')], new Set(), true)).toEqual({ mode: null, keys: [] });
    expect([...PROTECTED_PERMISSION_CODES].sort()).toEqual(['AUTHRT_ASSIGN', 'AUTHRT_GRANT', 'MFA_RECOVER', 'USER_PASSWORD']);
  });

  it('보호 권한 집합은 화면 목록 생성물(PROTECTED_PERMISSIONS)과 같다 — 사본 리터럴로 어긋나지 않는다', () => {
    // 생성기 계약은 import 가 있는지만 본다. import 를 둔 채 사본 리터럴로 바꿔도 여기서 생성물과 다르면 red 다(3단계 A).
    expect([...PROTECTED_PERMISSION_CODES].sort()).toEqual([...PROTECTED_PERMISSIONS].sort());
  });

  it('추가가 막혀 있으면 켜진 칸의 해제만 남고, 켜진 칸이 없으면 할 일이 없다', () => {
    const scope = [op('BOARD:READ'), op('BOARD:CREATE')];
    expect(planBulkToggle(scope, new Set([key('BOARD_READ')]), false)).toEqual({ mode: 'clear', keys: [key('BOARD_READ')] });
    expect(planBulkToggle(scope, new Set(), false)).toEqual({ mode: null, keys: [] });
  });

  it('변경 칸은 기준선과 다른 칸이며 카탈로그 순서를 따른다', () => {
    const operations = [op('BOARD:READ'), op('BOARD:CREATE'), op('MENU:READ')];
    expect(changedOperationKeys(operations, new Set([key('MENU_READ'), key('BOARD_CREATE')]), new Set([key('BOARD_READ'), key('MENU_READ')])))
      .toEqual([key('BOARD_READ'), key('BOARD_CREATE')]);
    expect(changedOperationKeys(operations, new Set([key('BOARD_READ')]), new Set([key('BOARD_READ')]))).toEqual([]);
  });

  it('방향키 목적지는 빈 칸을 건너뛰고 위아래로는 가장 가까운 열을 고른다', () => {
    const cells = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 7 }, { row: 1, col: 0 }, { row: 1, col: 8 }, { row: 3, col: 2 }];
    expect(nextCellPosition(cells, { row: 0, col: 1 }, 'ArrowRight')).toEqual({ row: 0, col: 7 });
    expect(nextCellPosition(cells, { row: 0, col: 7 }, 'ArrowRight')).toBeNull();
    expect(nextCellPosition(cells, { row: 0, col: 7 }, 'ArrowLeft')).toEqual({ row: 0, col: 1 });
    expect(nextCellPosition(cells, { row: 0, col: 7 }, 'ArrowDown')).toEqual({ row: 1, col: 8 });
    expect(nextCellPosition(cells, { row: 0, col: 1 }, 'ArrowDown')).toEqual({ row: 1, col: 0 });
    // 비어 있는 줄 번호는 건너뛴다(거르기로 사라진 줄).
    expect(nextCellPosition(cells, { row: 1, col: 0 }, 'ArrowDown')).toEqual({ row: 3, col: 2 });
    expect(nextCellPosition(cells, { row: 0, col: 0 }, 'ArrowUp')).toBeNull();
    expect(nextCellPosition(cells, { row: 0, col: 0 }, 'Home')).toBeNull();
  });

  it('Ctrl/Cmd+S 만 저장 단축키다', () => {
    const event = { key: 's', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false };
    expect(isSaveShortcut({ ...event, ctrlKey: true })).toBe(true);
    expect(isSaveShortcut({ ...event, metaKey: true, key: 'S' })).toBe(true);
    expect(isSaveShortcut(event)).toBe(false);
    expect(isSaveShortcut({ ...event, ctrlKey: true, shiftKey: true })).toBe(false);
    expect(isSaveShortcut({ ...event, ctrlKey: true, altKey: true })).toBe(false);
  });
});

describe('진입 권한 고치기 계획', () => {
  const menu = (overrides: Partial<MenuMissingEntryPermission>): MenuMissingEntryPermission => ({
    code: '1', name: '메뉴', route: '/admin/x', required: [], mode: 'ANY', fixable: true, ...overrides,
  });
  const catalog = new Set(['MENU_READ', 'AUTHRT_READ', 'AUTHRT_AUDIT', 'POLL_READ', 'POLL_READ_ALL', 'BBS_MST_CREATE', 'BBS_MST_UPDATE']);

  it('필요 권한이 하나이거나 ALL 이면 정해진 권한을, 후보가 여럿인 ANY 는 조회를 먼저 권한다', () => {
    const fixes = planEntryFixes([
      menu({ code: 'a', required: ['MENU_READ'] }),
      menu({ code: 'b', required: ['POLL_READ', 'POLL_READ_ALL'], mode: 'ALL' }),
      menu({ code: 'c', required: ['AUTHRT_AUDIT', 'AUTHRT_READ'] }),
      menu({ code: 'd', required: ['BBS_MST_CREATE', 'BBS_MST_UPDATE'] }),
    ], catalog);
    expect(fixes).toEqual([
      expect.objectContaining({ kind: 'auto', codes: ['MENU_READ'] }),
      expect.objectContaining({ kind: 'auto', codes: ['POLL_READ', 'POLL_READ_ALL'] }),
      expect.objectContaining({ kind: 'choose', candidates: ['AUTHRT_AUDIT', 'AUTHRT_READ'], preferred: 'AUTHRT_READ' }),
      expect.objectContaining({ kind: 'choose', candidates: ['BBS_MST_CREATE', 'BBS_MST_UPDATE'], preferred: 'BBS_MST_CREATE' }),
    ]);
  });

  it('등록되지 않은 화면이나 현재 기능 목록에 없는 권한은 고친 것처럼 보이게 하지 않는다', () => {
    // PROGRAM_READ 는 라우트 원장에는 있지만 이 시나리오의 서버 기능 목록(catalog)에는 없다 — 배포 어긋남을 흉내 낸다.
    const fixes = planEntryFixes([
      menu({ code: 'a', fixable: false }),
      menu({ code: 'b', required: ['PROGRAM_READ'] }),
      menu({ code: 'c', required: ['POLL_READ', 'PROGRAM_READ'], mode: 'ALL' }),
      menu({ code: 'd', required: ['PROGRAM_READ', 'MENU_READ'] }),
    ], catalog);
    expect(fixes.map((fix) => fix.kind)).toEqual(['unfixable', 'unfixable', 'unfixable', 'auto']);
    expect(fixes[3]).toEqual(expect.objectContaining({ codes: ['MENU_READ'] }));
  });
});
