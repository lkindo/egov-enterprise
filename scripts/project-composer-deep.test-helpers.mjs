// 정밀 점검 계약 시험(project-composer-deep*.test.mjs)이 함께 쓰는 준비물이다. 이 파일은 시험이 아니다(이름이 *.test.mjs 가 아니라
// 운영 계약 실행이 고르지 않는다). 오래 걸리는 시험을 파일로 나눠 병렬로 돌리려고 원래 파일의 준비물을 그대로 옮겼다 —
// node 는 한 파일의 시험을 차례로 돌리고 파일끼리는 함께 돌린다.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { composerOwnership, loadComposerModules } from './composer-modules.mjs';
import { UPSTREAM_ATLAS } from './reusable-source-gates.mjs';
import { normalize, trackedAndUntrackedFiles } from './reusable-source-tree.mjs';
import { MESSAGE_BUNDLES } from './reusable-source-messages.mjs';

export const root = resolve(import.meta.dirname, '..');
export const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
/*
 * 정밀 점검을 실제 저장소로 여러 번 도는 시험이 넘기는 기억하는 읽기(compositionDeepPlan 의 readSource). 시험 중에는 저장소 파일이
 * 바뀌지 않으므로 같은 원문을 다시 읽지 않는다 — 점검 결과는 같고 읽기만 준다. 저장소 루트 **아래** 경로만 기억하고, 그 밖(임시
 * 폴더의 준비물·합성 저장소)은 늘 디스크에서 읽는다 — 준비물은 시험이 고쳐 쓰므로 기억하면 옛 원문으로 판정한다.
 * 모든 변이는 지금처럼 정밀 점검 전체 경로를 돈다(차단 라벨·실패 뒤 null 보고까지). 기본 읽기(디스크) 경로를 계속 돌게, 정밀 점검
 * 호출 하나는 이 읽기를 넘기지 않는다(project-composer-deep.test.mjs 의 전체 제품 구성 점검).
 */
export const memoizedRepositoryReader = (base = root, read = path => readFileSync(path, 'utf8')) => {
  const remembered = new Map();
  const underBase = path => { const child = relative(base, path); return child !== '' && !child.startsWith('..') && !isAbsolute(child); };
  return path => {
    if (!underBase(path)) return read(path);
    if (!remembered.has(path)) remembered.set(path, read(path));
    return remembered.get(path);
  };
};
export const readRepositorySource = memoizedRepositoryReader();
export const catalog = loadProjectComposerCatalog(root);
// 생성기·정밀 점검은 매니페스트 v2 의 기능 소유·시작 구성 기대치로 투영한다(11단계 C3). 시험은 그 선언을 고쳐 차단 사유를 만든다.
export const modules = loadComposerModules(root);
export const ownership = composerOwnership(modules);
export const withExpectations = (preset, change) => {
  const presetExpectations = structuredClone(modules.extras.presetExpectations);
  change(presetExpectations[preset]);
  return { ...modules, extras: { ...modules.extras, presetExpectations } };
};
export const files = trackedAndUntrackedFiles();
export const compose = (selection, from = catalog) => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'deep-test' }, sourceRef: 'main', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, from);
// 투영과 규칙 제거가 보는 파일: Java·프런트, 원본 Atlas 자산·검사, package.json(Atlas 별칭), 지운 ErrorCode 의 키를 걷는 메시지 번들.
// 복사 시간을 줄이려고 이것만 복사한다.
export const atlasPaths = [...UPSTREAM_ATLAS.assets, ...UPSTREAM_ATLAS.gates];
export const projectionFiles = files.filter(file => {
  const path = normalize(file);
  return path.endsWith('.java') || path.startsWith('frontend/') || path === 'package.json'
    || atlasPaths.some(asset => path === asset || path.startsWith(`${asset}/`)) || MESSAGE_BUNDLES.includes(path);
});
export const codes = deep => deep.blockers.map(blocker => blocker.code);
export const quietly = run => {
  const log = console.log;
  console.log = () => {};
  try { return run(); } finally { console.log = log; }
};
// 대소문자 구분은 폴더마다 다를 수 있다. 시험 폴더를 가리게 만들 수 있으면(Windows NTFS 폴더 속성) 만든다. 못 만들면 원래 구분을 따른다.
export const caseSensitiveDirectory = prefix => {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  if (process.platform === 'win32') {
    try { execFileSync('fsutil', ['file', 'setCaseSensitiveInfo', directory, 'enable'], { stdio: 'ignore' }); } catch { /* 지원하지 않는 디스크 */ }
  }
  return directory;
};
