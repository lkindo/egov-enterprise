import type { MenuStructureSource } from './menuStructureSource';

/**
 * 프로그램 ↔ 메뉴 연결(순수 계산). 화면 관리의 '이전 프로그램' 탭이 쓴다.
 *
 * 세는 규칙은 서버의 삭제 거부와 같다 — `ProgramService.assertNotReferenced` 는 `tb_menu_info.prgrm_file_nm` 이
 * 이 파일명과 같은 메뉴가 하나라도 있으면(사용 여부와 무관하게) 409 `RESOURCE_IN_USE` 로 거부한다.
 * 그래서 사용 안 함 메뉴도 연결로 센다. 빼면 '연결 없음' 이라고 보이는데 삭제는 거부되는 화면이 된다.
 * 파일명 비교도 서버 SQL 과 같이 정확 일치다(공백을 다듬지 않는다).
 *
 * [2026-10-02 D3] 읽는 데이터도 같은 표다. 이 열은 메뉴 구조 조회(`getMenuStructure`, MENU_READ)를 읽고, 그 응답은
 * 서버 캐시를 거치지 않고 DB 를 직접 본다(종전 메뉴 전체 조회는 인스턴스마다 10분 캐시를 거쳤다). 다만 화면을 연 뒤에
 * 다른 곳에서 바뀐 연결은 다시 불러와야 보이므로 화면은 이 열을 참고 정보로만 말하고, 최종 판정은 삭제할 때 서버가 한다.
 *
 * 메뉴는 이제 화면 경로(modern_route)로 연결한다. 메뉴 구조 저장은 메뉴의 연결 프로그램을 바꾸지 않으므로, 연결이 남은
 * 프로그램을 화면에서 풀어 줄 길은 없다 — 안내 문구가 없는 길(메뉴 관리에서 연결 해제)을 권하지 않는다.
 *
 * 서버 API 는 바꾸지 않는다. 조회가 거부·실패하면 0건으로 위장하지 않고 상태를 그대로 넘긴다.
 */

/** 메뉴 구조 한 줄에서 연결 판정에 쓰는 필드만. */
export interface MenuProgramLinkInput {
  menuNo: number;
  menuNm: string;
  prgrmFileNm?: string | null;
  useYn?: string | null;
}

/** 프로그램을 연결한 메뉴 한 건. */
export interface LinkedMenu {
  menuNo: number;
  menuNm: string;
  prgrmFileNm: string;
  /** 사용 안 함(useYn 'N') 메뉴도 연결로 센다 — 삭제 거부 기준과 같다. */
  inUse: boolean;
}

/**
 * 연결 정보의 출처 상태.
 * - checking: 권한을 확인하거나 메뉴를 불러오는 중이다
 * - loaded: 연결이 있는 메뉴 목록(연결 없는 메뉴는 싣지 않는다)
 * - forbidden: 메뉴 조회 권한(MENU_READ)이 없다 — 조회를 보내지 않았거나 서버가 403 으로 거부했다
 * - failed: 그 밖의 이유로 메뉴를 불러오지 못했다
 */
export type ProgramMenuLinkSource =
  | { status: 'checking' }
  | { status: 'loaded'; links: LinkedMenu[] }
  | { status: 'forbidden' }
  | { status: 'failed' };

/** 프로그램 한 행의 연결 메뉴 칸. */
export type ProgramMenuLinkCell =
  | { kind: 'linked'; menus: LinkedMenu[] }
  | { kind: 'none' }
  | { kind: 'checking' }
  | { kind: 'forbidden' }
  | { kind: 'failed' };

/** 메뉴 목록을 연결 봉투로 바꾼다. 배열이 아니면 0건으로 위장하지 않고 실패로 둔다. */
export function programMenuLinksFromMenus(
  menus: readonly MenuProgramLinkInput[] | null | undefined,
): ProgramMenuLinkSource {
  if (!Array.isArray(menus)) return { status: 'failed' };
  const links: LinkedMenu[] = [];
  for (const menu of menus) {
    const prgrmFileNm = menu.prgrmFileNm;
    if (typeof prgrmFileNm !== 'string' || prgrmFileNm === '') continue;
    links.push({
      menuNo: menu.menuNo,
      menuNm: menu.menuNm,
      prgrmFileNm,
      inUse: menu.useYn !== 'N',
    });
  }
  return { status: 'loaded', links };
}

/** 메뉴 구조 출처를 연결 봉투로 바꾼다. 확인 중·거부·실패는 그대로 넘긴다(0건으로 바꾸지 않는다). */
export function programMenuLinksFromSource(source: MenuStructureSource): ProgramMenuLinkSource {
  return source.status === 'loaded' ? programMenuLinksFromMenus(source.menus) : source;
}

function compareLinkedMenu(left: LinkedMenu, right: LinkedMenu): number {
  return left.menuNm.localeCompare(right.menuNm, 'ko') || left.menuNo - right.menuNo;
}

/**
 * 프로그램 파일명으로 연결 칸을 찾는 함수를 만든다. 메뉴 전체를 한 번 색인하므로 목록의 쪽·검색이
 * 바뀌어도 다시 조회하지 않는다. 연결 메뉴는 이름 순(같으면 메뉴 번호 순)이다.
 */
export function createProgramMenuLinkLookup(
  source: ProgramMenuLinkSource,
): (prgrmFileNm: string) => ProgramMenuLinkCell {
  if (source.status === 'checking') return () => ({ kind: 'checking' });
  if (source.status === 'forbidden') return () => ({ kind: 'forbidden' });
  if (source.status === 'failed') return () => ({ kind: 'failed' });

  const byProgram = new Map<string, LinkedMenu[]>();
  for (const link of source.links) {
    const menus = byProgram.get(link.prgrmFileNm);
    if (menus) menus.push(link);
    else byProgram.set(link.prgrmFileNm, [link]);
  }
  for (const menus of byProgram.values()) menus.sort(compareLinkedMenu);

  return (prgrmFileNm) => {
    const menus = byProgram.get(prgrmFileNm);
    return menus && menus.length > 0 ? { kind: 'linked', menus } : { kind: 'none' };
  };
}

/** 연결 칸의 한 줄 요약. 확인 중·거부·실패를 0건('연결 없음')으로 말하지 않는다. */
export function programMenuLinkSummary(cell: ProgramMenuLinkCell): string {
  switch (cell.kind) {
    case 'linked':
      return `연결 메뉴 ${cell.menus.length}개`;
    case 'none':
      return '연결 없음';
    case 'checking':
      return '연결 메뉴를 불러오는 중…';
    case 'forbidden':
      return '메뉴 조회 권한 없음';
    case 'failed':
      return '메뉴를 불러오지 못함';
  }
}

/** 삭제 확인에 이름을 싣는 연결 메뉴 수의 상한. 넘으면 '외 n개' 로 줄인다. */
const DELETE_NOTICE_NAME_LIMIT = 3;

/** 연결을 모르거나 없을 때의 삭제 안내. ProgramForm 의 기본 안내와 같은 문장이다. */
export const PROGRAM_DELETE_GENERAL_NOTICE = '이 프로그램을 연결한 메뉴가 있으면 삭제되지 않습니다.';

/**
 * 삭제 확인 문구에 붙일 연결 안내. 연결이 확인된 행이면 메뉴 수와 이름을 밝힌다 — 서버가 409 로 거부할 것을
 * 화면이 이미 알고 있는데 일반 문구만 보이지 않게 한다. 다만 이 정보는 화면을 연 시점의 메뉴 구조라 그 뒤 바뀌었을 수
 * 있으므로 삭제를 막지는 않고, 최종 판정은 서버(409)에 맡긴다. 확인 중·거부·실패·연결 없음은 일반 안내다.
 * 화면에 없는 길(메뉴 관리에서 연결 해제)은 권하지 않는다 — 메뉴 구조 저장은 메뉴의 연결 프로그램을 바꾸지 않는다.
 */
export function programDeleteLinkNotice(cell: ProgramMenuLinkCell): string {
  if (cell.kind !== 'linked') return PROGRAM_DELETE_GENERAL_NOTICE;
  const names = cell.menus.slice(0, DELETE_NOTICE_NAME_LIMIT).map((menu) => menu.menuNm).join(', ');
  const rest = cell.menus.length - DELETE_NOTICE_NAME_LIMIT;
  const nameList = rest > 0 ? `${names} 외 ${rest}개` : names;
  return `불러온 메뉴 구조 기준으로 메뉴 ${cell.menus.length}개(${nameList})가 이 프로그램을 연결하고 있습니다. `
    + '연결이 남아 있으면 삭제되지 않습니다.';
}
