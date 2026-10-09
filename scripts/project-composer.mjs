#!/usr/bin/env node
/** Shared local composition engine: CLI and web transport execute the same recipe. */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { classifyRecipeFailure, resolveProjectRecipe, sourceRefIsValid } from './project-composer-recipe.mjs';
import { loadProjectComposerMenus, projectComposerMenuPreview } from './project-composer-menu-preview.mjs';
import { compositionDiff } from './project-composer-diff.mjs';
import { loadUnassignedPermissionGuidance } from './project-composer-unassigned.mjs';
import { composerPresentation, loadRouteKinds } from './project-composer-presentation.mjs';
import { composerPreflight } from './project-composer-preflight.mjs';
import { compositionDeepPlan, deepSummary } from './project-composer-deep.mjs';
import { ComposerError, classifyDeclarationFailure } from './project-composer-errors.mjs';
import { createLogMasker, runComposerCommand } from './project-composer-command.mjs';
import { PREFLIGHT_TIMEOUT_MS, composerOutputPaths, createGenerator } from './project-composer-generate.mjs';
import { recoverAbandonedJobs } from './project-composer-recovery.mjs';

export { composerOutputPaths, createLogMasker, runComposerCommand };

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const hasBatchim = word => /[\uAC00-\uD7A3]$/.test(word) && (word.charCodeAt(word.length - 1) - 0xAC00) % 28 !== 0;
const withObject = word => `${word}${hasBatchim(word) ? '을' : '를'}`;
const withSubject = word => `${word}${hasBatchim(word) ? '이' : '가'}`;
/** 필수 외래 키 위반을 사용자에게 보일 문장으로 바꾼다. 내부 경로나 클래스명은 싣지 않는다. */
export function foreignKeyBlockers(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  return composition.foreignKeyViolations.map(violation => `${label(violation.sourceDomain)}의 ${violation.childTable} 테이블이 `
    + `${label(violation.targetDomain)}의 ${violation.parentTable} 테이블을 외래 키로 참조합니다. `
    + `${withObject(label(violation.targetDomain))} 함께 선택해야 생성할 수 있습니다.`);
}
/** 기능 저하를 빠진 기능별로 묶어 화면 문장을 만든다. 생성을 막지 않는 안내다. */
export function degradationNotes(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  const groups = new Map();
  for (const edge of composition.degraded) {
    if (!groups.has(edge.to)) groups.set(edge.to, { to: edge.to, heading: `${withObject(label(edge.to))} 고르지 않아 줄어드는 동작`, reasons: [] });
    groups.get(edge.to).reasons.push({ from: edge.from, reason: edge.reason });
  }
  return [...groups.values()];
}
/** 자동 포함 근거의 종류. 화면에서 접힌 근거로만 보인다. */
export const REQUIRES_KIND_LABELS = Object.freeze({ java: '코드 참조', manifest: '생성 묶음 선언', 'shared-ui': '공동 화면', 'ui-import': '화면 참조' });
/**
 * 자동 포함을 화면 문장으로 바꾼다(설계서 9.3·E2). 경로 사슬, 단계마다 사용자용 한 문장, 해제 방법을 싣고
 * 개발자 근거(종류·파일)는 접어서 보일 수 있게 따로 둔다. 클래스명·기능 id 는 문장에 싣지 않는다.
 */
export function inclusionNotes(composition, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  return composition.autoIncluded.map(item => {
    const roots = item.roots.map(label);
    const listed = [...roots.slice(0, -1), withObject(roots.at(-1))].join(', ');
    return {
      domain: item.domain, label: label(item.domain), roots: [...item.roots],
      path: [item.chain[0].from, ...item.chain.map(hop => hop.to)].map(label).join(' → '),
      steps: item.chain.map(hop => ({ from: hop.from, to: hop.to, text: `${label(hop.from)} → ${label(hop.to)}: ${hop.userReason}`,
        evidence: hop.kinds.map(kind => REQUIRES_KIND_LABELS[kind] ?? kind), files: [...hop.evidence] })),
      removal: `이 기능을 빼려면 ${listed} ${roots.length > 1 ? '모두 ' : ''}해제하세요.`,
    };
  });
}
const signed = number => (number > 0 ? `+${number}` : number < 0 ? `−${-number}` : '0');
const DIFF_COUNT_LABELS = Object.freeze({ tables: '테이블', menus: '메뉴', permissions: '권한' });
/**
 * 계획 차이를 카드에 보일 한 문장으로 바꾼다(설계서 10장·E3). 늘고 주는 기능·테이블·메뉴·권한과
 * 새로 생기거나 사라지는 기능 저하, 생성을 막는 외래 키를 말한다. 들어오는 기능과 빠지는 기능은 이름을 붙인다
 * (누른 기능 하나만 움직이면 되풀이하지 않는다). 빼도 남는 기능은 무엇이 붙잡는지 먼저 말하고, 시작 구성에서
 * 직접 선택으로 바뀌며 생기는 다른 변화가 있으면 이어서 말한다.
 */
export function diffSummary(diff, catalog) {
  const label = id => catalog.capabilities.find(capability => capability.id === id)?.label ?? id;
  const named = ids => {
    const names = [...ids.filter(id => id === diff.domain), ...ids.filter(id => id !== diff.domain)].map(label);
    return names.length > 3 ? `${names.slice(0, 3).join(', ')} 외 ${names.length - 3}개` : names.join(', ');
  };
  // 누른 기능 하나만 들어오거나 빠지면 이름을 되풀이하지 않는다. 다른 기능이 함께 움직이면 양쪽을 모두 밝힌다.
  const [toward, against] = diff.action === 'add' ? [diff.added, diff.removed] : [diff.removed, diff.added];
  const plain = against.length === 0 && toward.every(id => id === diff.domain);
  const moved = plain ? [] : [
    ...(diff.added.length ? [`들어옴: ${named(diff.added)}`] : []),
    ...(diff.removed.length ? [`빠짐: ${named(diff.removed)}`] : []),
  ];
  const parts = [`기능 ${signed(diff.added.length - diff.removed.length)}${moved.length ? `(${moved.join('; ')})` : ''}`,
    ...Object.entries(DIFF_COUNT_LABELS).map(([key, name]) => `${name} ${signed(diff.counts[key][1] - diff.counts[key][0])}`)];
  if (diff.degraded.added.length) parts.push(`줄어드는 동작 ${diff.degraded.added.length}건 생김`);
  if (diff.degraded.resolved.length) parts.push(`줄어들던 동작 ${diff.degraded.resolved.length}건 해소`);
  if (diff.blockers.length) parts.push('필수 외래 키 때문에 생성할 수 없습니다');
  if (diff.action === 'remove' && diff.retainedBy.length) {
    const retained = `빼도 ${withSubject(diff.retainedBy.map(label).join(', '))} 요구해 계속 포함됩니다`;
    const changed = diff.added.length || diff.removed.length || diff.degraded.added.length || diff.degraded.resolved.length || diff.blockers.length
      || Object.keys(DIFF_COUNT_LABELS).some(key => diff.counts[key][0] !== diff.counts[key][1]);
    return changed ? `${retained} · ${parts.join(' · ')}` : `${retained}.`;
  }
  return `${diff.action === 'add' ? '고르면' : '빼면'} ${parts.join(' · ')}`;
}
function git(root, args, executable = 'git') {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  // git 실행 파일이 없으면 원본을 확인할 수 없다. 화면은 설치·PATH 확인을 안내한다(종료 코드 실패와 구분한다).
  if (result.error?.code === 'ENOENT') throw new ComposerError('TOOL_UNAVAILABLE', { tool: 'git' }, 'git executable is not available');
  if (result.error || result.status !== 0) throw Object.assign(new Error('Source checkout identity could not be verified'), { gitStatus: result.status });
  return result.stdout.trim();
}
export function composerSourceFingerprint(root) {
  const hash = createHash('sha256');
  const files = git(root, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).sort();
  for (const file of files) {
    if (file.replaceAll('\\', '/').split('/').includes('build')) continue;
    const path = join(root, file);
    hash.update(`${file}\0`);
    /*
      존재를 먼저 묻고 그 다음에 읽으면 두 호출 사이에 파일이 바뀔 수 있다(TOCTOU).
      지문은 "읽은 내용"을 근거로 삼아야 하므로 바로 읽고, 읽지 못한 경우만 [missing] 으로
      적는다 — 디렉터리·심볼릭 링크 깨짐·권한 부족은 모두 readFileSync 가 던지며
      종전 분기와 같은 결과로 수렴한다.
    */
    let contents = null;
    try {
      contents = readFileSync(path);
    } catch {
      contents = null;
    }
    hash.update(contents ?? '[missing]');
    hash.update('\0');
  }
  return hash.digest('hex');
}

/**
 * outputRoot 는 계약 테스트용 이음새다. 기본값은 원본 저장소이고 CLI·서버는 넘기지 않는다.
 * 실제 생성기 스크립트는 저장소 build/ 밖 출력을 거부하므로, 운영 경로에서 다른 값을 넘기면
 * 생성이 실패할 뿐 출력이 새지 않는다.
 */
export function createComposerEngine({ root = ROOT, outputRoot, run = runComposerCommand, fingerprint = composerSourceFingerprint,
  loadCatalog = loadProjectComposerCatalog, gitExecutable = 'git', readiness } = {}) {
  root = realpathSync(root);
  outputRoot = outputRoot === undefined ? root : realpathSync(outputRoot);
  const gitRun = args => git(root, args, gitExecutable);
  /*
   * 오류 분류(설계서 14.2, E4). 원본 커밋 → 메뉴 스냅숏 → 카탈로그 → 해석기 순서로 본다. 원본이 바뀌었으면 바뀐 선언이 낳은
   * 다른 오류(모르는 기능, 낡은 스냅숏)보다 SOURCE_CHANGED 를 먼저 말한다 — 새 원본으로 다시 불러오면 함께 풀리기 때문이다.
   */
  const recipeCommit = recipe => {
    const reference = recipe?.sourceRef;
    // git 에 넘기기 전에 형식부터 본다. 옵션처럼 읽히는 값('-x')은 명령 인자가 되지 않는다.
    if (!sourceRefIsValid(reference)) {
      throw new ComposerError('INVALID_RECIPE', { field: 'sourceRef' }, 'A source reference without shell, traversal or revision-expression syntax is required');
    }
    const head = gitRun(['rev-parse', 'HEAD']);
    let commit;
    try { commit = gitRun(['rev-parse', '--verify', `${reference}^{commit}`]); }
    catch (error) {
      if (error instanceof ComposerError) throw error;
      throw new ComposerError('SOURCE_CHANGED', {}, 'Recipe sourceRef is not available in this checkout');
    }
    // The local generator exports the inspected checkout. It never silently checks out another revision.
    if (commit !== head) throw new ComposerError('SOURCE_CHANGED', {}, 'Recipe sourceRef does not identify the current checkout');
    return commit;
  };
  // 카탈로그는 메뉴 스냅숏으로 탭 선언을 검증하지만 스냅숏 해시는 보지 않는다. 적재가 실패했을 때 스냅숏이 낡았으면
  // 선언 위반이 아니라 갱신하면 풀리는 MENU_SNAPSHOT_STALE 로 말한다.
  const loadCatalogClassified = () => {
    try { return loadCatalog(root); }
    catch (error) {
      try { loadProjectComposerMenus(root); }
      catch (menuError) { if (menuError instanceof ComposerError && menuError.code === 'MENU_SNAPSHOT_STALE') throw menuError; }
      throw classifyDeclarationFailure(error, root);
    }
  };
  // 화면 문구·미배정 권한 안내·메뉴 투영도 선언이다. 일부러 던진 실패만 CATALOG_DRIFT 로, 런타임 결함은 그대로 둔다.
  const declared = read => { try { return read(); } catch (error) { throw classifyDeclarationFailure(error, root); } };
  const resolveRecipe = (recipe, value) => { try { return resolveProjectRecipe(recipe, value); } catch (error) { throw classifyRecipeFailure(error); } };
  // 계획 차이는 마지막으로 적재한 카탈로그와 메뉴 스냅숏을 다시 쓴다(카탈로그 적재는 수 초가 걸린다).
  // 차이는 미리보기일 뿐이고, 계획과 생성은 늘 카탈로그를 새로 적재해 다시 판정한다.
  let latest;
  const remember = (value, menus) => { latest = { catalog: value, menus }; return value; };
  const catalog = () => {
    const value = remember(loadCatalogClassified());
    const sourceCommit = gitRun(['rev-parse', 'HEAD']);
    // 화면 문구는 카탈로그 해시 밖에 덧붙인다. 문구를 고쳐도 구성 해시가 바뀌지 않는다.
    return { ...value, sourceRef: sourceCommit, sourceCommit, presentation: declared(() => composerPresentation(value, { routeKinds: loadRouteKinds(root) })) };
  };
  const plan = recipe => {
    const sourceCommit = recipeCommit(recipe);
    const snapshot = loadProjectComposerMenus(root);
    const current = remember(loadCatalogClassified(), snapshot.menus);
    const composition = resolveRecipe(recipe, current);
    const owner = code => current.capabilities.find(capability => capability.permissionCodes.includes(code))?.id ?? 'core';
    return { ...composition, sourceCommit, blockers: foreignKeyBlockers(composition, current),
      inclusionNotes: inclusionNotes(composition, current),
      degradationNotes: degradationNotes(composition, current),
      // 기본 그룹이 없어 생성 직후 아무에게도 배정되지 않는 권한. 생성을 막지 않고, 완료 뒤 할 일로 보인다.
      unassignedPermissions: declared(() => loadUnassignedPermissionGuidance(root)).filter(row => composition.permissionCodes.includes(row.code))
        .map(row => ({ ...row, owner: owner(row.code) })),
      outputDirectory: `build/reusable-base/source/${composition.project.name}-<generation-id>`,
      // 공통 기반 시작 구성과 비교해 이 구성이 더하는 메뉴를 표시한다(설계서 E8). 그 시작 구성이 없는 카탈로그는 표시하지 않는다.
      menus: declared(() => projectComposerMenuPreview(root, composition, snapshot, {
        base: current.presets.some(preset => preset.id === 'core') ? resolveRecipe({ ...recipe, selection: { preset: 'core' } }, current) : undefined })),
      // 도구·작업 트리처럼 이 컴퓨터의 상태는 생성 전 점검(preflight)이 실제로 확인해 말한다.
      warnings: composition.requirements.map(requirement => `추가 설정: ${requirement}`),
    };
  };
  const diff = (recipe, domain) => {
    latest ??= { catalog: loadCatalogClassified() };
    latest.menus ??= loadProjectComposerMenus(root).menus;
    let result;
    try { result = compositionDiff({ catalog: latest.catalog, menus: latest.menus, recipe, domain }); }
    catch (error) {
      const recipeFailure = classifyRecipeFailure(error);
      throw recipeFailure === error ? classifyDeclarationFailure(error, root) : recipeFailure;
    }
    return { ...result, summary: diffSummary(result, latest.catalog) };
  };
  // 생성 전 점검: 명령 하나가 멈춰도 화면이 기다리지 않도록 명령마다 시간 제한을 둔다.
  // sourceCommit 은 점검을 요청한 화면이 카탈로그를 받은 때의 커밋이다(탭마다 다를 수 있어 엔진에 두지 않는다).
  const preflight = ({ sourceCommit } = {}) => composerPreflight({ outputRoot, sourceCommit,
    probe: (command, args) => run(command, args, { root, capture: true, timeoutMs: PREFLIGHT_TIMEOUT_MS }) });
  // 정밀 점검: 생성기의 투영 판정을 디스크를 바꾸지 않고 미리 한다(요청할 때만, 수 초가 걸린다).
  // 계획처럼 카탈로그를 새로 적재하고, 생성기가 복사할 파일 목록(추적·무시되지 않은 새 파일, build 제외)을 쓴다.
  const deep = recipe => {
    recipeCommit(recipe);
    // 해석기가 거부한 구성은 코드가 붙은 입력 오류다(화면을 연 뒤 카탈로그가 바뀌었을 수도 있다). 그 밖의 실패는 점검 실패다.
    const composition = resolveRecipe(recipe, loadCatalogClassified());
    const manifest = JSON.parse(readFileSync(join(root, 'config/reusable-base-profiles.json'), 'utf8'));
    const files = gitRun(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)
      .filter(file => !file.replaceAll('\\', '/').split('/').includes('build'));
    // 대소문자 구분은 생성물을 만들 폴더(composerOutputPaths 의 상위 폴더)에서 판정한다.
    const result = compositionDeepPlan({ root, manifest, composition, files, outputParent: resolve(outputRoot, 'build/reusable-base/source') });
    return { ...result, summary: deepSummary(result) };
  };
  const generate = createGenerator({ root, outputRoot, run, fingerprint, gitRun, plan, resolveRecipe, loadCatalogClassified, readiness });
  // 기동 시 정리(E6b): 이 컴퓨터에서 시작했고 프로세스가 끝난 미완료 작업의 임시 DB·소스 폴더만 정리한다. Docker 가 멈춰 있어도
  // 기동을 붙잡지 않도록 명령마다 시간 제한을 둔다.
  const recover = () => recoverAbandonedJobs({ outputRoot,
    docker: (args, options = {}) => run('docker', args, { root, capture: true, timeoutMs: PREFLIGHT_TIMEOUT_MS, ...options }) });
  return { catalog, plan, diff, preflight, deep, generate, recover, outputRoot };
}

export function parseComposerArgs(args) {
  if (args.length === 1 && args[0] === 'catalog') return { action: 'catalog' };
  if (args.length !== 3 || !['plan', 'generate'].includes(args[0]) || args[1] !== '--recipe' || !args[2] || args[2].startsWith('--')) {
    throw new Error('Usage: project-composer.mjs catalog | plan --recipe FILE | generate --recipe FILE');
  }
  return { action: args[0], recipeFile: args[2] };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseComposerArgs(process.argv.slice(2));
    const engine = createComposerEngine();
    // Ctrl+C·종료 신호는 진행 중인 생성을 취소하고, 엔진이 임시 DB·소스 폴더를 정리한 뒤 끝난다(E6b).
    const controller = new AbortController();
    const stop = name => { process.stderr.write(`[composer] ${name}: 진행 중인 생성을 취소하고 정리합니다…\n`); controller.abort(); };
    // 터미널을 닫거나 접속이 끊길 때(SIGHUP)도 같다. 작업 명령은 따로 떨어진 프로세스 그룹이라 그 신호를 받지 못한다.
    for (const name of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.once(name, () => stop(name));
    const result = args.action === 'catalog' ? engine.catalog()
      : await engine[args.action](JSON.parse(readFileSync(resolve(args.recipeFile), 'utf8')), {
        signal: controller.signal,
        onProgress: ({ stage, progress, timeline }) => {
          const step = timeline?.steps?.find(item => item.status === 'running')?.id;
          process.stderr.write(`[composer] ${stage}${step ? ` · ${step}` : ''} ${progress}%\n`);
        },
      });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) { process.stderr.write(`[composer] ${error.message}\n`); process.exitCode = 1; }
}
