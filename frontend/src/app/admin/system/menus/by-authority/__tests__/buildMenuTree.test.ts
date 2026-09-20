/**
 * 그룹별 메뉴 현황의 계층 조립 계약.
 *
 * 이 파일이 존재하는 이유는 **화면의 핵심 기능이 조용히 죽어 있었기 때문**이다.
 * `buildMenuTree` 는 최상위를 `upperMenuId === 0` 으로만 판정했는데, V2_100 이 최상위 4개를
 * `up_menu_sn = NULL` 로 고정했고(그 마이그레이션이 `count(*) WHERE up_menu_sn IS NULL <> 4` 를
 * 예외로 검사한다) 백엔드는 그 값을 그대로 싣는다. 그래서 루트가 한 건도 잡히지 않아 모든 권한
 * 그룹에서 트리가 비었고, 화면은 배정 건수를 세는 바로 옆에서 '할당된 메뉴 없음' 을 보여 줬다.
 *
 * 어떤 게이트도 이것을 보지 못했다 — e2e 는 `.lucide-folder/.lucide-file` **또는**
 * '할당된 메뉴 없음' 중 하나만 보이면 통과하므로, 늘 후자로 초록이었다.
 */
import { describe, it, expect } from 'vitest';
import { buildMenuTree } from '../MenuByAuthorityClient';
import type { MenuByAuthority } from '@/types/foundation/security';

const menu = (menuNo: number, menuNm: string, upperMenuId: number | null | undefined) =>
  ({ menuNo, menuNm, upperMenuId, menuOrdr: 1, prgrmFileNm: '' } as unknown as MenuByAuthority);

describe('buildMenuTree', () => {
  it('상위 메뉴가 NULL 인 최상위를 루트로 잡는다(서버가 실제로 보내는 형태)', () => {
    const tree = buildMenuTree([
      menu(9000000, '관리 센터', null),
      menu(9010000, '권한 보안', 9000000),
      menu(9010220, '그룹별 메뉴 현황', 9010000),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].menuNm).toBe('관리 센터');
    expect(tree[0].children?.[0].menuNm).toBe('권한 보안');
    expect(tree[0].children?.[0].children?.[0].menuNm).toBe('그룹별 메뉴 현황');
  });

  it('상위 메뉴가 0 이거나 값이 없는 레거시 형태도 루트로 잡는다', () => {
    const tree = buildMenuTree([menu(1, '0 형태', 0), menu(2, '미지정 형태', undefined)]);

    expect(tree.map((n) => n.menuNm)).toEqual(['0 형태', '미지정 형태']);
  });

  it('상위가 배정 집합에 없으면 그 하위를 버리지 않고 최상위로 올린다', () => {
    // 그룹에 하위 메뉴만 배정된 경우 — 상위가 없다는 이유로 숨기면 화면이 사실보다 적게 말한다.
    const tree = buildMenuTree([menu(9010220, '그룹별 메뉴 현황', 9010000)]);

    expect(tree).toHaveLength(1);
    expect(tree[0].menuNm).toBe('그룹별 메뉴 현황');
  });

  it('배정이 없으면 빈 계층이다', () => {
    expect(buildMenuTree([])).toEqual([]);
  });
});
