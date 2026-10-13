#!/usr/bin/env node
/**
 * generate-screen-registry — 화면 목록 생성기(관리 콘솔 2단계, D3·D4 의 원천).
 *
 * 메뉴가 가리키는 대상은 '프로그램'(레거시 URL 인가 서술자)이 아니라 앱 화면이다. 이 생성기는 코드 원장 두 개와
 * 화면의 쓰기 권한 사용처를 합쳐 화면 목록을 빌드 시점에 만든다. 같은 사실을 config JSON 에 따로 두지 않는다 —
 * 정본은 아래 입력이고 산출물은 frontend/src/types/generated-screen-registry.ts 하나다.
 *
 *   · 화면 모집단 — frontend/src/app 의 page 파일 중 라우팅이 page 인 것(ui-route-capabilities-contract.mjs 와 같은 판정).
 *     page-redirect·config-redirect 는 별칭으로 따로 내보내며 링크하지 않는다(역참조 가드). 화면 파일이 없는 앱 설정
 *     (next.config redirects()) 리다이렉트도 별칭이다(appRedirectAliases) — 앱 설정 리다이렉트는 화면 파일보다 먼저 적용되는데
 *     목록에 없으면 그 경로가 동적 형제(…/[id])로 풀려 엉뚱한 화면에 귀속된다(레거시 게시판 경로 selectBoardList 가
 *     게시글 작성 화면으로 넘기는 동적 별칭 /admin/community/boards/[id] 에 맞았다).
 *   · 진입 권한 — config/governance/permission-catalog.json pagePermissions(정확 경로 → 같은 세그먼트 수 동적 형제)·
 *     pagePermissionModes(기본 ANY).
 *   · 쓰기 권한 — operation-consumer census 축 3 의 계산(analyzeWritePermissionNeeds).
 *   · 표시 권한 — canPermission(…, 'CODE') 리터럴로 적힌 권한과, 슬롯 기여 항목의 노출 술어 visibleWhen.permissions(10단계 10a).
 *     술어는 그 항목을 그리는 셸(소비자 표 — 허브별·배치별)의 화면에 귀속한다. page 술어는 링크 노출이라 목적지 화면의 진입
 *     권한이 이미 말하므로, always 술어는 판정이 없으므로 귀속하지 않는다. 레이아웃 셸(LAYOUT_SHELL_FILES — 머리글·바닥글·오류
 *     화면·명령 센터)만 그리는 항목은 귀속할 화면이 없다. 그 밖의 술어가 화면 0개로 귀속되면 원본에서는 실패하고, 투영본(투영 원장이
 *     있는 생성물)에서는 그 항목을 그리던 셸·화면이 투영으로 지워졌다는 증거(projectionZeroAttribution)가 있을 때만 받아 기록한다
 *     (predicates 의 removedByProjection — CLI 가 줄마다 출력한다). 증거가 없으면 투영본에서도 실패한다.
 *   · 귀속 — 파일은 가장 가까운 page 디렉터리의 화면에 귀속하고, 그 파일을 import 하는 다른 화면들에도 귀속한다
 *     (다른 라우트의 허브 클라이언트를 렌더하는 하위 화면 — /admin/help/faq 가 지식 허브 클라이언트를 연다).
 *     다음은 공용 파일이라 그것을 import 하는 화면들에만 귀속한다: src/components 등 app 밖 파일, 별칭 라우트
 *     디렉터리의 파일, page 는 없고 하위에 page 를 품은 라우트 구간의 파일(app/admin/user 의 허브 클라이언트), 그리고
 *     app/ 루트의 page.tsx 밖 파일. 루트 페이지(/)가 모든 앱 파일의 가장 가까운 page 라서, 마지막 구분 없이는
 *     layout·헤더·전역 provider 의 쓰기가 업무 홈 화면의 권한으로 잡힌다(layout 을 import 하는 파일은 없으므로 거기서
 *     멈춘다). import 는 축 3 의 이름 기반 importersOf 에 `dynamic(() => import('…/Name'))` 형태를 더해 찾는다 —
 *     업무 홈은 자기 클라이언트를 동적 import 로 연다. 축 3 판정은 바꾸지 않는다.
 *   · 라벨 — 메뉴 snapshot(config/project-composer-menus.json)의 menu_nm → 라우트 원장 visibleLabel → 없음.
 *     탭을 가리키는 메뉴(경로에 ?tab= 등 쿼리가 있는 것)는 화면이 아니라 탭의 이름이라 라벨 원천에서 뺀다. 재사용 생성물의
 *     라우트 원장은 검토 전('unverified')이라, 같은 page 파일이면 원본 라우트 원장 스냅숏의 라벨을 쓴다(UPSTREAM_ROUTE_LEDGER).
 *   · shellAccess — 라우트 원장(config/ui-route-capabilities.json) 값.
 *   · 권한 묶음 — config/governance/permission-bundles.json(관리 콘솔 3단계 D5). 묶음이 여는 화면은 원장에 적지 않고
 *     위 화면 목록에서 계산한다: 진입 권한이 빈 화면을 빼고, 진입 권한을 이 묶음이 충족하는(ANY 하나 이상, ALL 전부)
 *     화면이다(screens). 진입 권한이 빈 화면(로그인 사용자 누구나 들어가는 화면) 가운데 이 묶음의 권한을 쓰기('write')로
 *     쓰는 화면은 관련 화면(relatedScreens)이다 — 권한 작업대가 그 메뉴 표시도 더한다(2026-10-03, 선택지 ①). 표시 리터럴
 *     ('display')은 어느 버튼에 걸었는지 모르는 언급이라 보지 않는다(엉뚱한 메뉴가 붙는다 — 2026-10-02 검토). 카탈로그의
 *     모든 권한은 어느 묶음에 있거나 원장 excluded 에 사유와 함께 있어야 한다. 묶음은 그룹이 아니다 — 권한 작업대가 고른
 *     묶음의 기능권한을 그룹 초안에 더할 뿐이고, 저장은 같은 '권한 변경 저장'(버전 확인·보호 권한·마지막 관리자 보호·감사)이
 *     한다. 이 생성기가 원장을 검증한다(buildPermissionBundles). 재사용 생성물(투영 원장이 있는 트리)에서는 묶음이 여는 화면 없이
 *     관련 화면만 남아도 받는다 — 생성기가 구성으로 줄인 묶음 원장이다(reusable-permission-projection.mjs, 10단계 10b).
 *     묶음의 이름·설명이 쓰면 안 되는 용어는 화면 용어 원장(config/frontend-visible-terms.json terms)에서 읽는다 — 사본을
 *     두지 않는다(replacedTermFinder).
 *
 * TypeScript 없이 정하는 부분(화면 모집단·별칭·진입 권한·라벨·shellAccess, 묶음 검증, 산출물 렌더·판독·불변식)은
 * screen-registry-model.mjs 에 있다. 이 생성기는 적재할 때 frontend 의 TypeScript 를 읽으므로, 재사용 투영·정밀 점검은 그 모듈만 쓴다.
 *
 * 거버넌스 총량(AGENTS.md): generate-permissions 를 넓히지 않은 이유 — 그 생성기는 의존성 없이 재사용 투영이
 * frontend 설치 없이 부르고, 이 생성기는 TypeScript AST(축 3)가 필요하다. 축 3 계산은 새 판정기가 아니라
 * operation-consumer-census.mjs 의 공용 함수를 그대로 쓴다.
 *
 * Usage:
 *   node scripts/generate-screen-registry.mjs           # 산출물을 다시 쓴다
 *   node scripts/generate-screen-registry.mjs --check   # 산출물이 낡았으면 실패한다
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  analyzeWritePermissionNeeds, isIntermediaryFile, isServiceFile, isTestFile, stripTsComments,
} from './operation-consumer-census.mjs';
import { SLOT_REGISTRY_CONSUMERS, SLOT_ROOT, slotConsumerFiles, slotConsumerPartition, slotPathKind } from './slot-registry.mjs';
import { PROJECTION_LEDGER_PATH, projectionLedgerErrors } from './reusable-projection-ledger.mjs';
import {
  APP_PREFIX, SCREEN_REGISTRY_INPUTS, SCREEN_REGISTRY_OUTPUT, appDirectoryOf, buildPermissionBundles, buildScreenFrame, byCodePoint, readJson,
  renderScreenRegistry, replacedTermFinder, screenRow, toPosix,
} from './screen-registry-model.mjs';

export {
  PROTECTED_PERMISSIONS, SCREEN_REGISTRY_INPUTS, SCREEN_REGISTRY_OUTPUT, UPSTREAM_ROUTE_LEDGER, buildPermissionBundles, buildScreenFrame,
  readScreenRegistryArtifact, renderScreenRegistry, replacedTermFinder, validateScreenRegistry,
} from './screen-registry-model.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 레이아웃 셸 — 슬롯 레지스트리를 읽지만 어느 화면에도 속하지 않는 앱 틀(머리글·바닥글·오류 화면·명령 센터). 이 셸만 그리는 기여
 * 항목의 노출 술어(머리글 알림의 NOTI_READ 등)는 귀속할 화면이 없다(10단계 10a). 목록의 파일은 슬롯 소비자여야 하고 어느 화면에도
 * 귀속되지 않아야 한다 — 생성기가 확인한다. 화면에 닿는 셸을 여기 두면 그 화면의 술어가 조용히 빠지므로 실패한다.
 */
export const LAYOUT_SHELL_FILES = Object.freeze([
  'frontend/src/app/components/layout/footer.tsx',
  'frontend/src/app/components/layout/header.tsx',
  'frontend/src/app/components/ui/global-command-center.tsx',
  'frontend/src/app/error.tsx',
]);
const CAN_PERMISSION_LITERAL = /\bcanPermission\s*\([^,;]*,\s*(['"`])([A-Z][A-Z0-9_]*)\1\s*\)/gu;
const DISPLAY_SOURCE_ROOTS = ['frontend/src/app', 'frontend/src/components'];

/** 생성기는 frontend 의 TypeScript 로 AST 를 만든다. 대상 저장소에 없으면(임시 fixture·투영본) 이 저장소의 것을 쓴다. */
function loadTypeScript(root) {
  for (const base of [root, repoRoot]) {
    try {
      return createRequire(path.join(base, 'frontend', 'package.json'))('typescript');
    } catch {
      // 다음 후보를 본다.
    }
  }
  throw new Error('Screen registry generation requires frontend TypeScript (pnpm -C frontend install)');
}

function walkFiles(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walkFiles(target, output);
    else if (entry.isFile() && /\.(?:ts|tsx)$/u.test(entry.name)) output.push(target);
  }
  return output;
}


export function buildScreenRegistry(root = repoRoot) {
  const policies = readJson(root, SCREEN_REGISTRY_INPUTS.policies);
  const boundaries = readJson(root, SCREEN_REGISTRY_INPUTS.boundaries);
  const bundleLedger = readJson(root, SCREEN_REGISTRY_INPUTS.bundles);
  const findReplacedTerm = replacedTermFinder(readJson(root, SCREEN_REGISTRY_INPUTS.visibleTerms));
  // 화면 모집단·별칭·진입 권한·라벨·shellAccess 는 TypeScript 없는 뼈대가 정한다(재사용 권한 투영과 같은 함수 — 10단계 10b).
  const { actions, known, pages, screens, aliases, routeByDir, hostsPages } = buildScreenFrame(root);

  // 파일 → 화면 귀속(맨 위 주석의 '귀속').
  const analysis = analyzeWritePermissionNeeds({ boundaries, policies, repoRoot: root, ts: loadTypeScript(root) });
  // 축 3 의 importersOf 는 정적 `from '…/Name'` 만 본다. 같은 화면 파일 모집단(app·components 의 .tsx, 테스트·서비스·
  // 중간 모듈 제외)에서 `import('…/Name')` 동적 import 를 더한다 — 축 3 판정(gated)은 그대로 둔다.
  const uiSources = new Map();
  for (const sourceRoot of DISPLAY_SOURCE_ROOTS) {
    for (const absolute of walkFiles(path.join(root, sourceRoot))) {
      const file = toPosix(path.relative(root, absolute));
      if (!file.endsWith('.tsx') || isTestFile(file) || isIntermediaryFile(file) || isServiceFile(file)) continue;
      uiSources.set(file, stripTsComments(fs.readFileSync(absolute, 'utf8')));
    }
  }
  const dynamicImportersOf = file => {
    const name = path.posix.basename(toPosix(file)).replace(/\.(?:ts|tsx)$/u, '');
    const pattern = new RegExp(`\\bimport\\s*\\(\\s*['"][^'"]*/${name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}['"]\\s*\\)`, 'u');
    return [...uiSources].filter(([other, source]) => other !== file && pattern.test(source)).map(([other]) => other);
  };
  const importers = new Map();
  const importersOf = file => {
    if (!importers.has(file)) importers.set(file, [...new Set([...analysis.importersOf(file), ...dynamicImportersOf(file)])].sort(byCodePoint));
    return importers.get(file);
  };
  const rootPage = pages.find(page => page.route === '/')?.source ?? null;
  const ownerOf = file => {
    if (!file.startsWith(APP_PREFIX)) return { kind: 'shared' };
    // 가장 가까운 page 디렉터리까지 올라가되, page 는 없고 하위에 page 를 품은 디렉터리(허브 클라이언트를 둔
    // app/admin/user 같은 라우트 구간)를 지나면 그 하위 화면들이 함께 쓰는 공용 파일이다.
    for (let directory = appDirectoryOf(file); ; directory = appDirectoryOf(`${APP_PREFIX}${directory}`)) {
      const route = routeByDir.get(directory);
      if (route !== undefined) {
        return screens.has(route) && (route !== '/' || file === rootPage) ? { kind: 'screen', route } : { kind: 'shared' };
      }
      if (hostsPages.has(directory) || directory === '') return { kind: 'shared' };
    }
  };
  /*
    [10단계 10a] 소비자를 값별로 나눈 슬롯(hub-tabs 는 허브별, stats-panels 는 배치별)의 기여는 항목마다 그 값의 소비자에게만 닿는다
    (축 3 의 importersOf 가 항목의 값으로 reader 를 가른다). 그런데 쓰기·canPermission 리터럴은 어느 항목이 그 모듈을 가리키는지 모른 채
    기여 파일을 거쳐 올라온다. 한 기여 파일의 항목이 여러 값에 걸쳐 있으면(게시판 → 통계: 셸 탭 둘과 요약 칸 하나) 그 쓰기·표시가 모든
    값의 소비자 화면에 함께 붙으므로 거부한다 — 조용히 넓게 붙이면 권한 작업대가 그 화면에 없는 권한을 보인다. 값마다 기여 파일을 나누면
    통과한다. 노출 술어(visibleWhen.permissions)는 항목 단위로 따로 귀속하므로 이 제한을 받지 않는다.
  */
  const mixedPartitionOf = file => {
    if (!file.startsWith(`frontend/${SLOT_ROOT}/`)) return null;
    const kind = slotPathKind(file);
    const partition = kind?.kind === 'contribution' ? slotConsumerPartition(kind.slot) : null;
    if (!partition) return null;
    const values = [...new Set(analysis.visibilityOf(file).map(entry => entry[partition.key]))].sort(byCodePoint);
    return values.length > 1 ? { slot: kind.slot, key: partition.key, values } : null;
  };
  /*
    [10단계 10a] 슬롯 소비자(레지스트리를 읽는 셸, slot-registry.mjs 의 소비자 표)는 놓인 디렉터리의 화면이 아니라 그것을 그리는 화면
    (importer)에 귀속한다. 통계 셸(IntelligenceHubClient)은 /admin/stats 디렉터리에 있지만 그 화면(통계 요약)은 통계 셸이 아니라 요약
    화면을 그린다 — 디렉터리로 귀속하면 셸 탭의 권한이 요약 화면에 붙는다. 다른 소비자는 모두 자기 디렉터리의 page 가 그리므로 importer 로
    귀속해도 결과가 같다.
  */
  const slotConsumerShells = new Set(Object.keys(SLOT_REGISTRY_CONSUMERS).flatMap(slot => slotConsumerFiles(slot)));
  const screensOf = (file, permissionUse) => {
    const found = new Set();
    const seen = new Set();
    const visit = current => {
      if (seen.has(current)) return; // import 순환
      seen.add(current);
      const mixed = mixedPartitionOf(current);
      if (mixed) {
        throw new Error(`${mixed.slot} 기여 파일의 항목이 여러 ${mixed.key}(${mixed.values.join(', ')})에 걸쳐 있어 그 파일을 거치는 `
          + `쓰기·canPermission 리터럴을 한 소비자에 가를 수 없다(${permissionUse}, ${file} → ${current}). ${mixed.key} 마다 기여 파일을 나눈다.`);
      }
      const owner = ownerOf(current);
      if (owner.kind === 'screen' && !slotConsumerShells.has(current)) found.add(owner.route);
      // 화면 파일도 다른 화면이 import 해 렌더할 수 있다(허브 클라이언트 재사용) — 거기서 멈추지 않는다.
      importersOf(current).forEach(visit);
    };
    visit(file);
    return found;
  };

  // 쓰기 — 축 3 의 화면별 쓰기 권한.
  for (const need of analysis.needs) {
    known(need.permission, `write operation called from ${need.file}`);
    for (const route of screensOf(need.file, `쓰기 ${need.permission}`)) screens.get(route).granted.get('write').add(need.permission);
  }

  // 표시 — canPermission 리터럴(주석은 지운다). 귀속은 쓰기와 같다.
  for (const sourceRoot of DISPLAY_SOURCE_ROOTS) {
    for (const absolute of walkFiles(path.join(root, sourceRoot))) {
      const file = toPosix(path.relative(root, absolute));
      if (isTestFile(file)) continue;
      const source = stripTsComments(fs.readFileSync(absolute, 'utf8'));
      const codes = [...source.matchAll(CAN_PERMISSION_LITERAL)].map(match => known(match[2], `canPermission literal in ${file}`));
      if (codes.length === 0) continue;
      for (const route of screensOf(file, `표시 ${codes.join('·')}`)) codes.forEach(code => screens.get(route).granted.get('display').add(code));
    }
  }

  /*
    [10단계 10a] 표시 — 슬롯 기여 항목의 노출 술어(visibleWhen.permissions). 판독기는 축 3 의 항목 단위 판독기 하나이고(파일 단위로
    합치지 않는다), 항목을 그리는 셸은 그 항목의 값(hub·placement)이 가리키는 소비자뿐이다. 셸의 화면은 셸이 놓인 디렉터리가 아니라 셸을
    그리는 화면이다(screensOf 의 slotConsumerShells). page·always 술어는 귀속하지 않는다(맨 위 주석).
  */
  const projectionRemoved = (() => {
    const ledgerFile = path.join(root, PROJECTION_LEDGER_PATH);
    if (!fs.existsSync(ledgerFile)) return null;
    const projectionLedger = JSON.parse(fs.readFileSync(ledgerFile, 'utf8'));
    const errors = projectionLedgerErrors(projectionLedger);
    if (errors.length > 0) throw new Error(`Projection ledger is invalid: ${errors.join('; ')}`);
    return new Set(projectionLedger.removedFiles);
  })();
  /*
    [10단계 검토] 투영본의 귀속 0 은 그 항목을 그리던 셸·화면이 투영으로 지워졌다는 증거가 있을 때만 받는다. 원장이 있다는 것만으로는 받지
    않는다 — 원장과 무관하게 셸이 레지스트리를 읽지 않게 되거나 셸 import 가 끊긴 생성물(잘못 이은 슬롯 소비자)이 조용히 통과한다. 다음을
    모두 본다(원본 실행은 귀속 0 을 늘 거부한다).
      · 소비자 표가 그 항목의 값에 적은 셸(레이아웃 셸 제외)이 하나 이상이다.
      · 없는 셸은 원장에 있다 — 원장 밖 부재는 투영 결과가 아니다.
      · 남은 셸은 그 기여의 레지스트리를 읽는다 — 읽지 않으면 화면이 빠진 것이 아니라 연결이 끊긴 것이다.
      · 남은 셸을 import 하는 파일이 남지 않았다(셸이 고아다) — 남은 import 가 화면에 닿지 않으면 연결 결함이다. 그리고 원장이 화면(page)
        파일을 하나 이상 지웠다.
    한계: 남은 공용 셸을 원본에서 어느 화면이 그렸는지는 투영본에 없다(그 화면 파일이 없다). 화면이 남았는데 셸 import 만 끊겨(pack 마커)
    셸이 고아가 된 경우도 통과한다 — 그 화면은 실제로 그 항목을 그리지 않으므로 귀속 0 이 사실과 맞다. 투영 밖에서 손으로 끊은 것과는
    투영본만으로 구분하지 못한다.
  */
  const projectionZeroAttribution = (file, entry, readers, codes) => {
    const fail = reason => new Error(`기여 항목의 노출 술어가 투영본에서도 어느 화면에도 귀속되지 않는다: ${file} ${entry.id} `
      + `(${codes.join('·')}) — ${reason}`);
    const slot = slotPathKind(file).slot;
    const partition = slotConsumerPartition(slot);
    const value = partition ? entry[partition.key] : null;
    const declared = (partition ? (Object.hasOwn(partition.consumers, value) ? partition.consumers[value] : []) : slotConsumerFiles(slot))
      .filter(shell => !LAYOUT_SHELL_FILES.includes(shell));
    if (declared.length === 0) throw fail('그 항목을 그리는 셸이 소비자 표에 없다');
    const removedShells = [];
    const orphanedShells = [];
    for (const shell of declared) {
      if (!fs.existsSync(path.join(root, shell))) {
        if (!projectionRemoved.has(shell)) throw fail(`셸이 없는데 투영 원장에 없다: ${shell}`);
        removedShells.push(shell);
        continue;
      }
      if (!readers.includes(shell)) throw fail(`남은 셸이 그 기여의 레지스트리를 읽지 않는다(연결이 끊겼다): ${shell}`);
      const left = importersOf(shell);
      if (left.length > 0) throw fail(`남은 셸을 import 하는 파일이 화면에 닿지 않는다(연결이 끊겼다): ${shell} ← ${left.join(', ')}`);
      orphanedShells.push(shell);
    }
    if (orphanedShells.length > 0 && ![...projectionRemoved].some(removed => removed.startsWith(APP_PREFIX) && removed.endsWith('/page.tsx'))) {
      throw fail(`남은 셸이 고아인데 투영 원장이 화면(page) 파일을 지우지 않았다: ${orphanedShells.join(', ')}`);
    }
    return { removedShells, orphanedShells };
  };
  // 레이아웃 셸은 앱 틀이라 Next 경계 파일(layout·template·error·loading·not-found — 라우트의 오류 경계는 루트 오류 화면을 다시
  // 내보낸다)을 거쳐서만 화면에 닿아야 한다. 화면의 내용(page 와 그것이 그리는 모듈)이 셸을 그리면 그 화면의 술어가 조용히 빠지므로 거부한다.
  const routeBoundary = /\/(?:layout|template|error|global-error|loading|not-found)\.tsx$/u;
  const contentScreensOf = shell => {
    const found = new Set();
    const seen = new Set();
    const visit = current => {
      if (seen.has(current)) return;
      seen.add(current);
      if (current !== shell && routeBoundary.test(current)) return;
      const owner = ownerOf(current);
      if (owner.kind === 'screen' && !slotConsumerShells.has(current)) found.add(owner.route);
      importersOf(current).forEach(visit);
    };
    visit(shell);
    return [...found].sort(byCodePoint);
  };
  for (const shell of LAYOUT_SHELL_FILES) {
    if (!fs.existsSync(path.join(root, shell))) continue;
    if (!slotConsumerShells.has(shell)) throw new Error(`레이아웃 셸 목록의 파일이 슬롯 소비자가 아니다: ${shell}`);
    const reached = contentScreensOf(shell);
    if (reached.length > 0) throw new Error(`레이아웃 셸 목록의 파일을 화면이 그린다: ${shell} → ${reached.join(', ')}`);
  }
  const predicates = [];
  for (const file of analysis.contributionFiles) {
    for (const entry of analysis.visibilityOf(file)) {
      if (!entry.permissions || entry.permissions.length === 0) continue;
      const codes = entry.permissions.map(code => known(code, `visibleWhen.permissions of ${file} ${entry.id}`));
      const readers = analysis.entryReadersOf(file, entry);
      const shells = readers.filter(reader => !LAYOUT_SHELL_FILES.includes(reader));
      const record = { file, id: entry.id, permissions: [...codes].sort(byCodePoint), routes: [] };
      if (readers.length > 0 && shells.length === 0) {
        predicates.push({ ...record, layout: true });
        continue;
      }
      const routes = new Set(shells.flatMap(shell => [...screensOf(shell, `노출 술어 ${codes.join('·')}`)]));
      if (routes.size === 0) {
        if (!projectionRemoved) {
          throw new Error(`기여 항목의 노출 술어가 어느 화면에도 귀속되지 않는다: ${file} ${entry.id} (${codes.join('·')}, 셸 `
            + `${readers.join(', ') || '없음'}) — 그 항목을 그리는 셸이 소비자 표에 있는지, 레이아웃 셸이면 LAYOUT_SHELL_FILES 에 있는지 본다.`);
        }
        predicates.push({ ...record, removedByProjection: true, ...projectionZeroAttribution(file, entry, readers, codes) });
        continue;
      }
      for (const route of routes) codes.forEach(code => screens.get(route).granted.get('display').add(code));
      predicates.push({ ...record, routes: [...routes].sort(byCodePoint) });
    }
  }

  const registry = [...screens.values()].sort((left, right) => byCodePoint(left.route, right.route)).map(screen => screenRow(screen, actions));
  aliases.sort((left, right) => byCodePoint(left.route, right.route));
  // 투영 원장이 있는 트리(재사용 생성물)는 묶음을 투영본 규칙으로 계산한다 — 관련 화면만 남은 묶음도 받는다.
  const bundles = buildPermissionBundles(bundleLedger, {
    screens: registry, catalogCodes: [...actions.keys()].filter(code => typeof actions.get(code) === 'string'), findReplacedTerm,
    projected: projectionRemoved !== null,
  });
  return { screens: registry, aliases, bundles, predicates, text: renderScreenRegistry(registry, aliases, bundles) };
}



export function generateScreenRegistry(root = repoRoot, check = false) {
  const registry = buildScreenRegistry(root);
  const target = path.join(root, SCREEN_REGISTRY_OUTPUT);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n?/gu, '\n') !== registry.text) {
      throw new Error(`Generated screen registry is stale: ${SCREEN_REGISTRY_OUTPUT} (node scripts/generate-screen-registry.mjs)`);
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, registry.text);
  }
  return registry;
}

export function summarizeScreenRegistry({ screens, aliases, bundles = [], predicates = [] }) {
  const labelSources = { menu: 0, 'route-ledger': 0, none: 0 };
  for (const screen of screens) labelSources[screen.labelSource ?? 'none'] += 1;
  return {
    screens: screens.length,
    aliases: aliases.length,
    bundles: bundles.length,
    labelSources,
    screensWithWritePermissions: screens.filter(screen => screen.permissions.some(row => row.source === 'write')).length,
    unlabeled: screens.filter(screen => screen.label === null).map(screen => screen.route),
    predicates: {
      attributed: predicates.filter(row => row.routes.length > 0).length,
      layout: predicates.filter(row => row.layout).length,
      // 투영본에서 그리던 셸·화면이 지워져 귀속 0 으로 받은 술어 — 증거와 함께 줄마다 남긴다.
      removedByProjection: predicates.filter(row => row.removedByProjection)
        .map(row => `${row.file} ${row.id} ${row.permissions.join('·')} (removed shells: ${row.removedShells.join(', ') || '-'}; `
          + `orphaned shells: ${row.orphanedShells.join(', ') || '-'})`),
    },
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const check = process.argv.includes('--check');
  try {
    const summary = summarizeScreenRegistry(generateScreenRegistry(repoRoot, check));
    console.log(`Screen registry: ${summary.screens} screens, ${summary.aliases} aliases `
      + `(labels menu=${summary.labelSources.menu} route-ledger=${summary.labelSources['route-ledger']} none=${summary.labelSources.none}; `
      + `write permissions on ${summary.screensWithWritePermissions} screens), ${summary.bundles} permission bundles `
      + `${check ? 'verified' : 'written'}; slot predicates attributed=${summary.predicates.attributed} layout=${summary.predicates.layout} `
      + `removed-by-projection=${summary.predicates.removedByProjection.length}`);
    for (const row of summary.predicates.removedByProjection) console.log(`  removed by projection: ${row}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
