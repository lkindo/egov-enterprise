import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PROJECTION_LEDGER_FILE, REPO_ROOT, projectionRemovedFiles, projectionView } from './projection';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

function fixture(files: string[], removedFiles?: unknown, identity: Record<string, unknown> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'projection-view-'));
  roots.push(root);
  for (const file of files) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), 'x');
  }
  if (removedFiles !== undefined) {
    writeFileSync(join(root, PROJECTION_LEDGER_FILE), JSON.stringify({
      schemaVersion: 1, authority: 'generated-reusable-projection-ledger', removedFiles, ...identity,
    }));
  }
  return root;
}

describe('투영 원장 시험 도우미', () => {
  it('원장이 없으면(원본) 아무것도 빼지 않는다 — 없는 파일도 빠진 것으로 보지 않는다', () => {
    const view = projectionView(fixture(['frontend/a.ts']));
    expect(view.isRemovedByProjection('frontend/gone.ts')).toBe(false);
    expect(view.keepInProjection(['frontend/a.ts', 'frontend/gone.ts'], file => file)).toEqual(['frontend/a.ts', 'frontend/gone.ts']);
    expect(view.missingOutsideLedger(['frontend/a.ts', 'frontend/gone.ts'])).toEqual(['frontend/gone.ts']);
  });

  it('원장에 있고 실제로 없는 파일만 뺀다 — 절대 경로도 저장소 기준으로 맞춘다', () => {
    const root = fixture(['frontend/a.ts'], ['frontend/gone.ts']);
    const view = projectionView(root);
    expect(view.isRemovedByProjection(join(root, 'frontend', 'gone.ts'))).toBe(true);
    expect(view.inProjection(['frontend/a.ts', 'frontend/gone.ts'])).toBe(false);
    expect(view.inProjection('frontend/a.ts')).toBe(true);
    expect(view.keepInProjection([{ file: 'frontend/a.ts' }, { file: 'frontend/gone.ts' }], item => item.file))
      .toEqual([{ file: 'frontend/a.ts' }]);
    expect(view.missingOutsideLedger(['frontend/a.ts', 'frontend/gone.ts', 'frontend/typo.ts'])).toEqual(['frontend/typo.ts']);
    expect(view.readInProjection('frontend/a.ts')).toBe('x');
    expect(view.readInProjection('frontend/gone.ts')).toBeUndefined();
    // 원장에 없는 부재는 빠진 것이 아니다 — 읽기가 그대로 실패한다.
    expect(() => view.readInProjection('frontend/typo.ts')).toThrow(/ENOENT/);
    // 라우트 판정은 그 라우트의 page 파일로 한다.
    expect(view.pageInProjection('/admin/gone')).toBe(true);
    expect(projectionView(fixture([], ['frontend/src/app/admin/gone/page.tsx'])).pageInProjection('/admin/gone/')).toBe(false);
    // 파일별 동결표는 빠진 파일의 몫만 뺀다 — 원장에 없는 파일의 동결값은 그대로 남아 실측과 비교된다.
    expect(view.frozenInProjection({ 'a.ts': 2, 'gone.ts': 3, 'typo.ts': 1 }, key => `frontend/${key}`))
      .toEqual({ 'a.ts': 2, 'typo.ts': 1 });
  });

  it('원장이 있는 파일을 지웠다고 적으면 거르지 않고 실패한다', () => {
    const view = projectionView(fixture(['frontend/a.ts'], ['frontend/a.ts']));
    expect(() => view.inProjection('frontend/a.ts')).toThrow(/있는 파일을 지웠다고/);
  });

  it('원장 형식이 아니거나 저장소 밖 경로면 실패한다', () => {
    expect(() => projectionView(fixture([], 'frontend/a.ts')).inProjection('frontend/a.ts')).toThrow(/형식이 아니다/);
    expect(() => projectionView(fixture([], [3])).inProjection('frontend/a.ts')).toThrow(/형식이 아니다/);
    // 생성기가 쓴 원장이 아니면 믿지 않는다.
    expect(() => projectionView(fixture([], [], { authority: 'hand-written' })).inProjection('frontend/a.ts')).toThrow(/형식이 아니다/);
    expect(() => projectionView(fixture([], [], { schemaVersion: 2 })).inProjection('frontend/a.ts')).toThrow(/형식이 아니다/);
    expect(() => projectionView(fixture([], [])).repoPath('../outside.ts')).toThrow(/저장소 밖/);
  });

  it('기본 루트는 저장소(또는 생성물) 루트다', () => {
    expect(existsSync(join(REPO_ROOT, 'frontend', 'package.json'))).toBe(true);
    // 원본에는 원장 파일 자체가 없다 — 빈 원장이라도 생기면 생성물로 오인된다. 생성물의 원장이 lock 과 맞는지는
    //   scripts 의 원장 계약이 본다.
    if (!existsSync(join(REPO_ROOT, 'reusable-base-lock.json'))) {
      expect(existsSync(join(REPO_ROOT, PROJECTION_LEDGER_FILE)), '원본 저장소에 투영 원장이 있다').toBe(false);
      expect(projectionRemovedFiles().size).toBe(0);
    }
    for (const file of projectionRemovedFiles()) expect(existsSync(join(REPO_ROOT, file)), file).toBe(false);
  });
});
