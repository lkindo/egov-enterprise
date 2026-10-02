import { canPermission } from '@/lib/auth/permissions';
import {
  SCREEN_ALIASES,
  SCREEN_REGISTRY,
  findScreen,
  type ScreenRegistryEntry,
} from '@/types/generated-screen-registry';
import { normalizeInternalRoute } from './internal-route';

/**
 * 메뉴 → 화면 판정(관리 콘솔 2단계 D3·D4 공용, 2026-10-02).
 *
 * 화면 관리(/admin/system/programs — 화면 목록의 연결 메뉴와 '메뉴에 없는 화면')와 권한 작업대(/admin/security/authority —
 * 화면별 권한 표의 메뉴 줄과 '메뉴에 없는 화면' 묶음)가 이 판정 하나를 쓴다. 두 화면이 같은 화면에 서로 다른 사실을
 * 말하지 않게 한다.
 *
 * 메뉴가 여는 화면은 런타임에 그 메뉴가 실제로 여는 화면이다.
 *   1. 메뉴 경로를 내부 경로 해석(normalizeInternalRoute — 사이드바·명령 센터와 같은 경계)으로 거른다. 해석되지 않는
 *      경로('dir' 자리표시자·다른 출처·모호한 경로)는 어떤 화면도 열지 않는다.
 *   2. 쿼리·해시를 뗀 경로부를 생성 목록의 findScreen 으로 푼다(정확한 경로가 먼저, 없으면 리터럴이 더 많이 맞는 동적
 *      형제 — 라우트 판정과 같은 순서).
 *   3. 화면이 아니라 별칭(다른 화면으로 넘어가는 경로)이면 그 별칭을 한 번 따라가 목적지가 여는 화면으로 센다 — 주소록
 *      메뉴(`/admin/collaboration/address-book`)는 목록 화면으로 넘기는 별칭을 가리킨다.
 *   4. 동적 세그먼트로만 맞은 별칭(`/admin/community/boards/[id]` 처럼 경로 값 하나를 받아 넘기는 화면 파일)은 따라가지
 *      않는다 — 판정할 수 없다. 넘기는 곳이 받은 값에 따라 정해지는데, 그 경로가 실은 생성 목록이 모르는 리다이렉트일
 *      수도 있다(앱 설정의 레거시 게시판 경로가 그랬다 — 지금은 생성 목록이 앱 설정 리다이렉트를 별칭으로 싣는다).
 *      엉뚱한 화면에 메뉴를 붙이지 않는다.
 *
 * 3·4 는 findScreen 과 같은 판정이다: 동적 세그먼트가 없는 별칭은 경로가 정확히 같을 때만 맞고, 그때 그 별칭이 가장 많은
 * 리터럴로 맞는 경로다(화면과 별칭은 겹치지 않는다 — 생성기 불변식). 그래서 findScreen 이 화면을 못 찾고 정확히 같은
 * 정적 별칭이 있으면 그것이 findScreen 이 고른 경로다. 정확히 같은 정적 별칭이 없으면 findScreen 이 고른 것은 동적 별칭이거나
 * 아무것도 아니다(4 — 따라가지 않는다).
 *
 * 이 판정은 인가가 아니다 — 진입 권한은 라우트 게이트가, 동작 권한은 서버가 집행한다.
 */

const DYNAMIC_SEGMENT = /^\[[^.[\]]+\]$/;

/** 메뉴 하나가 여는 화면. */
export interface MenuScreenResolution {
  screen: ScreenRegistryEntry;
  /** 별칭을 거쳐 닿았으면 그 별칭 경로. 메뉴 경로가 화면 그 자체면 null. */
  viaAlias: string | null;
}

/** 쿼리·해시와 끝 슬래시를 뗀 경로부. 경로부가 비면 null(라우트 없는 메뉴는 '' 로 저장된다). */
function routePathOf(route: string): string | null {
  const pathOnly = route.split(/[?#]/, 1)[0];
  if (pathOnly.trim() === '') return null;
  return pathOnly.replace(/\/+$/, '') || '/';
}

/** 메뉴 경로가 여는 화면(위 규칙 1~4). 경로가 없거나 어떤 화면도 열지 않으면 null. */
export function resolveMenuScreen(modernRoute: string | null | undefined): MenuScreenResolution | null {
  const normalized = normalizeInternalRoute(modernRoute);
  if (normalized === null) return null;
  const path = routePathOf(normalized);
  if (path === null) return null;
  const direct = findScreen(path);
  if (direct) return { screen: direct, viaAlias: null };
  const alias = SCREEN_ALIASES.find((candidate) => candidate.route === path
    && !candidate.route.split('/').some((segment) => DYNAMIC_SEGMENT.test(segment)));
  if (!alias?.target) return null;
  const forwarded = findScreen(alias.target);
  return forwarded ? { screen: forwarded, viaAlias: alias.route } : null;
}

/** '메뉴에 없는 화면' 판정에 넣는 메뉴 한 건. 두 화면이 각자의 메뉴 모양에서 경로와 사용 여부만 넘긴다. */
export interface MenuRouteRef {
  /** 메뉴 경로(modernRoute). 없거나 비면 화면을 열지 않는다. */
  route: string | null | undefined;
  /** 메뉴 사용 여부(useYn). 'Y' 만 사용 중인 메뉴다. */
  useYn: string | null | undefined;
}

/** 사용 중인 메뉴. 사용 안 함('N')·모르는 값은 사이드바에 보이지 않으므로 화면을 여는 메뉴로 세지 않는다. */
function isMenuInUse(menu: MenuRouteRef): boolean {
  return menu.useYn === 'Y';
}

/**
 * 메뉴에 없는 화면 — 화면 목록 중 동적 세그먼트가 없는 화면 가운데, 어떤 사용 중인 메뉴도 위 규칙으로 풀리지 않는 화면이다.
 * 동적 경로 화면은 목록에서 항목을 골라 들어가는 화면이라 메뉴에 둘 수 없어 세지 않는다. 사용 안 함 메뉴만 가리키는 화면은
 * 런타임에 어떤 메뉴로도 열리지 않으므로 메뉴에 없는 화면이다(그 메뉴를 다시 쓰거나 새 메뉴를 만든다).
 * 결과는 화면 목록(registry) 순서다.
 */
export function screensWithoutMenu(
  menus: Iterable<MenuRouteRef>,
  registry: readonly ScreenRegistryEntry[] = SCREEN_REGISTRY,
): ScreenRegistryEntry[] {
  const opened = new Set<string>();
  for (const menu of menus) {
    if (!isMenuInUse(menu)) continue;
    const resolved = resolveMenuScreen(menu.route);
    if (resolved) opened.add(resolved.screen.route);
  }
  return registry.filter((screen) => !screen.dynamic && !opened.has(screen.route));
}

type PermissionSubject = Parameters<typeof canPermission>[0];

/**
 * 화면을 메뉴에 넣을 수 있는가 — 메뉴 관리가 새 메뉴를 등록하고(MENU_CREATE) 구조를 저장할 수 있다(MENU_UPDATE).
 * 메뉴 관리 화면에 들어갈 수 있는지(라우트 게이트와 같은 판정)는 이 버튼을 두는 화면이 목적지 리터럴로 함께 본다
 * (관리 링크 census — canOpenPage(user, '/admin/system/menus')).
 *
 * 이 판정을 화면 파일이 아니라 여기 두는 이유: 화면 목록 생성기는 화면(app·components) 파일의 canPermission 리터럴을 그
 * 화면의 표시 권한으로 센다. 이 두 권한은 '메뉴에 추가' 를 둔 화면(화면 관리)의 권한이 아니라 메뉴를 실제로 만드는 메뉴
 * 관리 화면의 권한이다 — 화면 관리 줄에 세면 권한 작업대의 화면별 권한 표가 메뉴 권한을 화면 관리의 등록·수정 칸에
 * 프로그램 권한과 섞어 보인다. 노출 판정일 뿐 인가가 아니다(H3).
 */
export function canAddScreensToMenus(subject: PermissionSubject): boolean {
  return canPermission(subject, 'MENU_CREATE') && canPermission(subject, 'MENU_UPDATE');
}
