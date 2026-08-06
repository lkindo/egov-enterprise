#!/usr/bin/env node
/**
 * menu-census — 메뉴(`tb_menu_info`)와 실제 Next.js 라우트의 정합을 기계로 측정한다.
 *
 * 왜 필요한가: 원장(`docs/04-operations/pending-decisions.md`)의 D-6 은 "중복 18메뉴 · 고아
 * 19라우트 · 부모/자식 동일경로" 라고 적고 있으나, 그 수치는 과거 시점의 값이다.
 * 이번 세션에서 원장 수치가 여러 번 틀린 것으로 드러났고(D-3 의 존재하지 않는 테이블,
 * D-5 의 "4종" → 실제 3종, D-12 의 "실물 있음" → 실제 0행), 게다가 V2_30/V2_42/V2_43 이
 * 메뉴를 직접 바꿨다. **재편 설계보다 먼저 현재 값을 재는 도구가 필요하다.**
 *
 * 이 스크립트는 판정하지 않고 **측정만** 한다. 무엇을 지우고 무엇을 합칠지는 정보구조 결정이며,
 * 그 결정은 정확한 현재 값 위에서 내려야 한다.
 *
 * 사용법:
 *   node scripts/menu-census.mjs           # 사람이 읽는 표
 *   node scripts/menu-census.mjs --json    # 기계 판독용
 *
 * DB 접속은 기존 db-bridge 를 그대로 쓴다(별도 접속 설정 없음).
 * 조회 전용(SELECT)이라 GEMINI.md §7 면책 특권 범위이며 승인 없이 실행 가능하다.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP_DIR = join(ROOT, 'frontend', 'src', 'app');
const JSON_MODE = process.argv.includes('--json');

/** db-bridge 를 통해 SELECT 한 결과를 객체 배열로 받는다. */
function query(sql) {
  const out = execFileSync(
    process.execPath,
    [join(ROOT, '.agent', 'scripts', 'db-bridge.js'), sql, '--json'],
    { encoding: 'utf8', cwd: ROOT, maxBuffer: 32 * 1024 * 1024 }
  );
  // db-bridge 는 경고 배너를 함께 찍으므로 첫 '[' 부터 파싱한다.
  const start = out.indexOf('[');
  if (start < 0) return [];
  return JSON.parse(out.slice(start));
}

/**
 * `app/` 아래 실제 라우트를 수집한다.
 * - `page.tsx` 가 있는 디렉터리가 곧 라우트다.
 * - 라우트 그룹 `(x)` 은 URL 에 나타나지 않으므로 제거한다.
 * - 동적 세그먼트 `[id]` 는 그대로 둔다(메뉴가 정적 경로를 갖는지 보는 것이 목적).
 */
function collectRoutes(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  if (entries.includes('page.tsx') || entries.includes('page.ts')) {
    const rel = relative(APP_DIR, dir).split(sep).filter(Boolean);
    const segments = rel.filter((s) => !(s.startsWith('(') && s.endsWith(')')));
    out.push('/' + segments.join('/'));
  }
  for (const e of entries) {
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) collectRoutes(p, out);
  }
  return out;
}

/** `?tab=x` 같은 쿼리를 떼어 경로만 남긴다. */
const pathOf = (route) => (route || '').split('?')[0].replace(/\/+$/, '') || '/';

/** 동적 세그먼트를 가진 라우트가 정적 경로를 덮는지 판정한다. */
function routeMatches(menuPath, routes) {
  if (routes.has(menuPath)) return true;
  for (const r of routes) {
    if (!r.includes('[')) continue;
    const re = new RegExp('^' + r.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
    if (re.test(menuPath)) return true;
  }
  return false;
}

const menus = query(`
  SELECT menu_sn, up_menu_sn, menu_nm, modern_route, prgrm_file_nm, use_yn, del_yn
  FROM tb_menu_info ORDER BY menu_sn
`);
const routeList = collectRoutes(APP_DIR);
const routes = new Set(routeList);

const active = menus.filter((m) => m.use_yn === 'Y' && m.del_yn !== 'Y');

// ① 깨진 메뉴 — 활성인데 가리키는 라우트가 없다(사용자가 눌러도 404/폴백)
const broken = active.filter((m) => {
  const p = pathOf(m.modern_route);
  return m.modern_route && !routeMatches(p, routes);
});

// ② 중복 — 같은 경로(쿼리 포함)를 가리키는 활성 메뉴가 둘 이상
const byRoute = new Map();
for (const m of active) {
  // 빈 문자열도 falsy 라 여기서 함께 걸러진다 — 폴더 표기가 NULL/'' 로 혼재해도 안전하다.
  if (!m.modern_route) continue;
  const k = m.modern_route;
  if (!byRoute.has(k)) byRoute.set(k, []);
  byRoute.get(k).push(m);
}
const duplicates = [...byRoute.entries()].filter(([, v]) => v.length > 1);

// ③ 부모/자식 동일 경로 — 트리에서 같은 곳을 두 번 가리킨다
const bySn = new Map(menus.map((m) => [String(m.menu_sn), m]));
const parentChildSame = active.filter((m) => {
  const parent = bySn.get(String(m.up_menu_sn));
  return parent && parent.modern_route && parent.modern_route === m.modern_route;
});

// ④ 고아 라우트 — 실제 화면인데 어떤 활성 메뉴도 가리키지 않는다.
//    단, 메뉴가 가리키는 화면의 **하위 경로**(상세·등록·수정 등)는 메뉴 대상이 아닌 것이 정상이므로
//    분리해서 센다. 이 구분을 하지 않으면 "고아 65건" 같은 노이즈 숫자가 나와 판단을 흐린다.
// pathOf('') === '/' 가 되므로 빈 문자열은 먼저 제거한다(폴더는 경로가 아니다).
const menuPaths = new Set(active.filter((m) => m.modern_route).map((m) => pathOf(m.modern_route)));
const hasMenuedAncestor = (r) => {
  const segs = r.split('/').filter(Boolean);
  for (let i = segs.length - 1; i > 0; i--) {
    if (menuPaths.has('/' + segs.slice(0, i).join('/'))) return true;
  }
  return false;
};
const notMenued = routeList.filter((r) => !menuPaths.has(r));
const subRoutes = notMenued.filter(hasMenuedAncestor);       // 하위 화면 — 정상
const orphanRoutes = notMenued.filter((r) => !hasMenuedAncestor(r)); // 진짜 고아 — 검토 대상

// ⑤ 감춰진 메뉴 — use_yn='N'. 되살릴 대상인지 지울 대상인지 판단 필요
const hidden = menus.filter((m) => m.use_yn !== 'Y' && m.del_yn !== 'Y');

const result = {
  measuredAt: null, // 호출부에서 스탬프 — 스크립트는 시간을 만들지 않는다
  totals: {
    menusAll: menus.length,
    menusActive: active.length,
    menusHidden: hidden.length,
    routes: routeList.length,
  },
  brokenMenus: broken.map((m) => ({ menuSn: m.menu_sn, menuNm: m.menu_nm, route: m.modern_route })),
  duplicateRoutes: duplicates.map(([route, v]) => ({
    route,
    menus: v.map((m) => ({ menuSn: m.menu_sn, menuNm: m.menu_nm })),
  })),
  parentChildSameRoute: parentChildSame.map((m) => ({
    menuSn: m.menu_sn, menuNm: m.menu_nm, route: m.modern_route, upMenuSn: m.up_menu_sn,
  })),
  orphanRoutes,
  subRoutes,
  hiddenMenus: hidden.map((m) => ({ menuSn: m.menu_sn, menuNm: m.menu_nm, route: m.modern_route })),
};

if (JSON_MODE) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const line = (s = '') => console.log(s);
  line('menu-census — tb_menu_info ↔ frontend/src/app 라우트 정합');
  line('='.repeat(72));
  line(`  메뉴 전체 ${result.totals.menusAll}  (활성 ${result.totals.menusActive} · 숨김 ${result.totals.menusHidden})`);
  line(`  실제 라우트 ${result.totals.routes}`);
  line();
  line(`① 깨진 메뉴 — 활성인데 라우트 없음: ${broken.length}건`);
  for (const m of result.brokenMenus) line(`     ${m.menuSn}  ${m.menuNm}  →  ${m.route}`);
  line();
  line(`② 중복 경로 — 같은 곳을 가리키는 활성 메뉴 2개 이상: ${duplicates.length}건`);
  for (const d of result.duplicateRoutes) {
    line(`     ${d.route}`);
    for (const m of d.menus) line(`        ${m.menuSn}  ${m.menuNm}`);
  }
  line();
  line(`③ 부모/자식 동일 경로: ${parentChildSame.length}건`);
  for (const m of result.parentChildSameRoute) line(`     ${m.menuSn}  ${m.menuNm}  →  ${m.route}  (부모 ${m.upMenuSn})`);
  line();
  line(`④ 진짜 고아 라우트 — 활성 메뉴도, 메뉴가 있는 상위 경로도 없음: ${orphanRoutes.length}건`);
  for (const r of orphanRoutes) line(`     ${r}`);
  line(`   (참고) 메뉴가 있는 화면의 하위 경로 ${subRoutes.length}건은 메뉴 대상이 아닌 것이 정상이라 제외했다.`);
  line();
  line(`⑤ 숨김 메뉴(use_yn='N'): ${hidden.length}건`);
  for (const m of result.hiddenMenus) line(`     ${m.menuSn}  ${m.menuNm}  →  ${m.route}`);
  line();
  line('※ 이 스크립트는 판정하지 않고 측정만 한다. 고아 라우트가 곧 삭제 대상은 아니다 —');
  line('   문자열 URL 참조는 정적 분석으로 잡히지 않으며, 과거 라우트 13개 오삭제 전례가 있다(V2_30).');
}
