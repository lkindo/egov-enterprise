/**
 * 투영 원장을 읽는 시험 도우미(Phase 2 D6).
 *
 * 재사용 생성물에서는 선택하지 않은 기능의 파일이 투영으로 지워진다. 그 파일을 경로로 읽는 계약은 생성물에서 처음부터
 * ENOENT 로 붉었다. 생성기는 지운 파일을 생성물 루트의 `reusable-projection-ledger.json` 에 적고 lock 이 그 해시를 결속한다
 * (scripts/reusable-projection-ledger.mjs). 이 도우미는 **원장에 있고 실제로 없는** 파일만 빠진 것으로 본다.
 *
 * - 원본 저장소에는 원장이 없으므로 아무것도 빼지 않는다 — 원본의 계약은 그대로다.
 * - 원장에 없는데 파일이 없으면 빠진 것이 아니라 계약이 틀린 것이다. 거르지 않으므로 시험의 읽기가 그대로 실패한다.
 * - 원장에 있는데 파일이 있으면 원장이 사실과 다르다. 거르지 않고 실패한다.
 *
 * skip 은 쓰지 않는다(forbidSkips 게이트). 대상이 빠졌으면 그 시험을 **등록하지 않고**, 파일 전체가 한 기능의 계약이면
 * `missingOutsideLedger` 로 "대상이 남아 있거나 투영으로 빠졌다" 를 늘 확인하는 시험 하나를 둔다(시험 0개 파일은 실패다).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 원본 저장소(또는 생성물) 루트 — frontend/src/test-utils 의 세 단계 위. */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const PROJECTION_LEDGER_FILE = 'reusable-projection-ledger.json';
const AUTHORITY = 'generated-reusable-projection-ledger';

type Files = string | readonly string[];

function readLedger(root: string): ReadonlySet<string> {
  let text: string;
  try {
    text = readFileSync(resolve(root, PROJECTION_LEDGER_FILE), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error;
    return new Set();
  }
  const ledger = JSON.parse(text) as { schemaVersion?: unknown; authority?: unknown; removedFiles?: unknown };
  if (ledger.schemaVersion !== 1 || ledger.authority !== AUTHORITY || !Array.isArray(ledger.removedFiles)
    || ledger.removedFiles.some(path => typeof path !== 'string')) {
    throw new Error(`투영 원장 형식이 아니다: ${PROJECTION_LEDGER_FILE}`);
  }
  return new Set(ledger.removedFiles as string[]);
}

/** 주어진 루트의 원장으로 판정하는 함수 묶음. 시험은 기본 루트(REPO_ROOT)의 묶음을 쓴다. */
export function projectionView(root: string) {
  let ledger: ReadonlySet<string> | undefined;
  const removedFiles = () => (ledger ??= readLedger(root));

  /** 절대 경로 또는 저장소 기준 경로를 저장소 기준 `/` 경로로 바꾼다. 저장소 밖이면 실패한다. */
  const repoPath = (path: string): string => {
    const target = (isAbsolute(path) ? relative(root, path) : path).split(sep).join('/');
    if (!target || target === '..' || target.startsWith('../') || isAbsolute(target)) {
      throw new Error(`저장소 밖의 경로다: ${path}`);
    }
    return target;
  };

  /** 투영이 지운 파일이면 true. 원장에 있는데 파일이 있으면 원장이 틀렸으므로 실패한다. */
  const isRemovedByProjection = (path: string): boolean => {
    const target = repoPath(path);
    if (!removedFiles().has(target)) return false;
    if (existsSync(resolve(root, target))) throw new Error(`투영 원장이 있는 파일을 지웠다고 적었다: ${target}`);
    return true;
  };

  const list = (files: Files) => (typeof files === 'string' ? [files] : files);

  /** 대상 파일이 하나도 투영으로 빠지지 않았으면 true — 시험을 등록할지 정한다. */
  const inProjection = (files: Files): boolean => !list(files).some(isRemovedByProjection);

  /** 투영으로 빠진 파일을 가리키는 항목만 뺀다. 원본에서는 그대로 돌려준다. */
  const keepInProjection = <T>(items: readonly T[], filesOf: (item: T) => Files): T[] =>
    items.filter(item => inProjection(filesOf(item)));

  /** 투영으로 빠졌으면 undefined, 아니면 원문. 원장에 없는 부재는 그대로 ENOENT 로 실패한다. */
  const readInProjection = (path: string): string | undefined =>
    isRemovedByProjection(path) ? undefined : readFileSync(resolve(root, repoPath(path)), 'utf8');

  /** 라우트의 page 파일(frontend/src/app/<경로>/page.tsx)이 투영으로 빠지지 않았으면 true. 동적 자리는 [이름] 그대로 쓴다. */
  const pageInProjection = (route: string): boolean =>
    inProjection(resolve(root, 'frontend', 'src', 'app', ...route.split('/').filter(Boolean), 'page.tsx'));

  /** 파일별 동결표에서 투영으로 빠진 파일의 항목만 뺀다. 키를 절대 경로로 바꾸는 함수를 받는다. */
  const frozenInProjection = (frozen: Readonly<Record<string, number>>, pathOf: (key: string) => string): Record<string, number> =>
    Object.fromEntries(keepInProjection(Object.entries(frozen), ([key]) => pathOf(key)));

  /** 없는데 원장에도 없는 파일 — 늘 등록하는 시험이 빈 목록을 기대한다. */
  const missingOutsideLedger = (files: readonly string[]): string[] =>
    files.map(repoPath).filter(target => !existsSync(resolve(root, target)) && !isRemovedByProjection(target));

  return {
    removedFiles, repoPath, isRemovedByProjection, inProjection, keepInProjection, readInProjection, frozenInProjection, missingOutsideLedger,
    pageInProjection,
  };
}

export const {
  removedFiles: projectionRemovedFiles,
  repoPath,
  isRemovedByProjection,
  inProjection,
  keepInProjection,
  readInProjection,
  frozenInProjection,
  missingOutsideLedger,
  pageInProjection,
} = projectionView(REPO_ROOT);
