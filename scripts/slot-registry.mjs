#!/usr/bin/env node
/**
 * 슬롯 레지스트리(슬롯 단계 PR-4). 기능이 core 셸에 기여하는 값을 마커 블록 대신 파일 단위로 모은다.
 *
 * 슬롯 이름 하나를 모든 곳에 같은 철자(케밥)로 쓴다: SlotMap 키(frontend/src/extensions/slots.ts) = 기여 파일 이름 = 레지스트리 파일 이름.
 * - 기여: frontend/src/extensions/<기능 id>/<슬롯>.ts — 항목 배열 하나를 default export 한다. owner 는 디렉터리 이름이다.
 * - 레지스트리: frontend/src/extensions/generated-<슬롯>.ts — 기여를 owner 코드 포인트 순으로 모은 생성 파일이다.
 * 슬롯 집합은 손으로 적지 않는다. 파일 목록에서 기여 파일 이름과 레지스트리 이름을 합쳐 얻는다 — 원본에서는 기여가, 투영으로 기여가
 * 모두 빠진 생성물에서는 남은 레지스트리가 슬롯을 알린다. 디스크를 걷지 않고 목록을 받으므로 정밀 점검도 복사 대상 목록으로 같은 답을 얻는다.
 *
 * 생성기·정밀 점검이 의존성 설치 전에 이 모듈을 부른다(투영 단계의 레지스트리 렌더) — Node 내장 모듈만 쓴다.
 *
 * 사용법: node scripts/slot-registry.mjs --write | --check   (npm run slots:generate · npm run slots:check)
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** frontend 기준 슬롯 디렉터리. */
export const SLOT_ROOT = 'src/extensions';
/** 슬롯 장치(core). 기능 디렉터리를 import 하지 않는다. */
export const SLOT_DEVICE_FILES = Object.freeze(['slots.ts', 'use-slot-entries.ts']);
const SLOT_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
// owner 는 카탈로그의 기능 id 다(소문자·숫자). 레지스트리의 import 바인딩 이름으로도 쓴다.
const OWNER_NAME = /^[a-z][a-z0-9]*$/;
// 바인딩 이름이 될 수 없는 예약어. 기능 id 가 이 가운데 하나면 렌더하지 않는다.
const RESERVED = new Set(['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else',
  'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let',
  'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try',
  'typeof', 'var', 'void', 'while', 'with', 'yield']);
// 로캘과 무관한 정렬(코드 포인트). 실행 환경에 따라 레지스트리 순서가 달라지지 않게 한다.
const byCodePoint = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export const slotRegistryPath = slot => `${SLOT_ROOT}/generated-${slot}.ts`;
export const slotContributionPath = (owner, slot) => `${SLOT_ROOT}/${owner}/${slot}.ts`;
/** 레지스트리가 내보내는 배열 이름(케밥 → camelCase). */
export const slotExportName = slot => slot.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase());

/**
 * frontend 기준 경로(`src/…`)로 맞춘다. 저장소 기준(`frontend/src/…`)·역슬래시도 받는다. 절대 경로는 받지 않는다 — 슬롯 디렉터리
 * 밖으로 읽혀 기여가 조용히 빠진다.
 */
export function frontendRelativePath(path) {
  const text = String(path).replaceAll('\\', '/');
  if (text.startsWith('/') || /^[A-Za-z]:\//.test(text)) throw new Error(`슬롯 판정에는 frontend 기준 경로를 넘긴다(절대 경로가 왔다): ${text}`);
  return text.replace(/^(?:\.\/)+/, '').replace(/^frontend\//, '');
}

/**
 * 슬롯 디렉터리 안 파일의 종류. 밖이면 null 이다. 안에는 장치(slots.ts·use-slot-entries.ts), 레지스트리(generated-<슬롯>.ts),
 * 기여(<기능>/<슬롯>.ts)만 둔다 — 그 밖의 파일(.tsx·하위 폴더·대문자 이름 등)은 판정할 수 없으므로 실패한다.
 */
export function slotPathKind(path) {
  const file = frontendRelativePath(path);
  if (!file.startsWith(`${SLOT_ROOT}/`)) return null;
  const parts = file.slice(SLOT_ROOT.length + 1).split('/');
  if (parts.length === 1) {
    if (SLOT_DEVICE_FILES.includes(parts[0])) return { kind: 'device', file };
    const registry = /^generated-(.+)\.ts$/.exec(parts[0]);
    if (registry && SLOT_NAME.test(registry[1])) return { kind: 'registry', slot: registry[1], file };
  } else if (parts.length === 2 && OWNER_NAME.test(parts[0])) {
    const contribution = /^(.+)\.ts$/.exec(parts[1]);
    if (contribution && SLOT_NAME.test(contribution[1]) && !contribution[1].startsWith('generated-')) {
      return { kind: 'contribution', owner: parts[0], slot: contribution[1], file };
    }
  }
  throw new Error('슬롯 디렉터리에는 장치(slots.ts·use-slot-entries.ts), 레지스트리(generated-<슬롯>.ts), '
    + `기여(<기능 id>/<슬롯>.ts, 케밥 이름)만 둔다: frontend/${file}`);
}

/** 파일 목록에서 슬롯 → owner 목록(코드 포인트 순)을 얻는다. 기여가 없는 레지스트리의 슬롯은 빈 목록이다. 슬롯도 코드 포인트 순이다. */
export function discoverSlotContributions(files) {
  const slots = new Map();
  const ownersOf = slot => {
    if (!slots.has(slot)) slots.set(slot, new Set());
    return slots.get(slot);
  };
  for (const path of files) {
    const kind = slotPathKind(path);
    if (kind?.kind === 'registry') ownersOf(kind.slot);
    if (kind?.kind === 'contribution') ownersOf(kind.slot).add(kind.owner);
  }
  return new Map([...slots.keys()].sort(byCodePoint).map(slot => [slot, [...slots.get(slot)].sort(byCodePoint)]));
}

/**
 * 레지스트리 원문(LF). 기여마다 바인딩 있는 default import 하나를 두고 owner 코드 포인트 순으로 배열에 싣는다. 기여가 없으면 타입 import
 * 와 빈 배열만 남긴다 — 부작용 import 는 쓰지 않는다. 같은 입력이면 같은 글자가 나온다(원본 parity 와 `--check` 가 이것을 비교한다).
 */
export function renderSlotRegistry(slot, owners) {
  if (!SLOT_NAME.test(slot) || slot.startsWith('generated-')) throw new Error(`슬롯 이름은 케밥이어야 한다: ${slot}`);
  const sorted = [...owners].sort(byCodePoint);
  const exportName = slotExportName(slot);
  for (const [index, owner] of sorted.entries()) {
    if (!OWNER_NAME.test(owner) || RESERVED.has(owner)) throw new Error(`레지스트리 바인딩이 될 수 없는 기능 id: ${owner} (${slot})`);
    if (index > 0 && sorted[index - 1] === owner) throw new Error(`같은 기능이 같은 슬롯에 두 번 기여한다: ${owner} (${slot})`);
    if (owner === exportName) throw new Error(`기능 id 가 레지스트리 이름과 같다: ${owner} (${slot})`);
  }
  return [
    `// Generated by scripts/slot-registry.mjs from frontend/src/extensions/*/${slot}.ts. Do not edit.`,
    '// 다시 만들기: npm run slots:generate · 확인: npm run slots:check',
    "import type { SlotContributions } from './slots';",
    ...sorted.map(owner => `import ${owner} from './${owner}/${slot}';`),
    '',
    `export const ${exportName}: readonly SlotContributions<'${slot}'>[] = [${sorted.join(', ')}];`,
    '',
  ].join('\n');
}

/** 디스크의 슬롯 디렉터리 파일(frontend 기준 경로). 폴더가 없으면 빈 목록이다. */
export function slotDirectoryFiles(frontendRoot) {
  const root = join(frontendRoot, SLOT_ROOT);
  if (!existsSync(root)) return [];
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => (entry.isDirectory()
    ? walk(join(directory, entry.name)) : [relative(frontendRoot, join(directory, entry.name)).split(sep).join('/')]));
  return walk(root).sort(byCodePoint);
}

/** 원본(또는 생성물) 트리에서 레지스트리를 기대값과 대조한다. 줄 끝(CRLF)은 비교하지 않는다. */
export function slotRegistryDrift(frontendRoot) {
  const drift = [];
  for (const [slot, owners] of discoverSlotContributions(slotDirectoryFiles(frontendRoot))) {
    const path = join(frontendRoot, slotRegistryPath(slot));
    const expected = renderSlotRegistry(slot, owners);
    if (!existsSync(path) || !statSync(path).isFile()) drift.push({ slot, owners, path, expected, reason: 'missing' });
    else if (readFileSync(path, 'utf8').replace(/\r\n/g, '\n') !== expected) drift.push({ slot, owners, path, expected, reason: 'stale' });
  }
  return drift;
}

/** 저장소 기준 레지스트리 경로(merge:main 재생성의 출력). 디스크의 지금 기여·레지스트리에서 얻는다. */
export function slotRegistryOutputs(repoRoot) {
  return [...discoverSlotContributions(slotDirectoryFiles(join(repoRoot, 'frontend'))).keys()].map(slot => `frontend/${slotRegistryPath(slot)}`);
}

function main(argv) {
  const mode = argv.length === 1 && ['--write', '--check'].includes(argv[0]) ? argv[0] : null;
  if (!mode) throw new Error('사용법: node scripts/slot-registry.mjs --write | --check');
  const frontendRoot = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'frontend');
  const drift = slotRegistryDrift(frontendRoot);
  if (mode === '--check') {
    if (drift.length) {
      throw new Error(`슬롯 레지스트리가 기여와 다르다 — npm run slots:generate 로 다시 만든다:\n${drift
        .map(row => `  ${row.reason}: ${relative(frontendRoot, row.path).split(sep).join('/')} (기여: ${row.owners.join(', ') || '없음'})`).join('\n')}`);
    }
    console.log('[slots] 레지스트리가 기여와 같다.');
    return;
  }
  for (const row of drift) writeFileSync(row.path, row.expected, 'utf8');
  console.log(drift.length ? `[slots] 다시 썼다: ${drift.map(row => slotRegistryPath(row.slot)).join(', ')}` : '[slots] 바뀐 레지스트리가 없다.');
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
