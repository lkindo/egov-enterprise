import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';

import {
  GENERATORS,
  HARNESS_MANIFEST,
  compareRowIds,
  findConflictMarkers,
  mergeMainAndRegenerate,
  planRegeneration,
  resolveMemoryTableConflicts,
  MEMORY_TABLES,
} from './merge-main-regenerate.mjs';
import { SCREEN_REGISTRY_INPUTS, SCREEN_REGISTRY_OUTPUT } from './generate-screen-registry.mjs';
import { slotRegistryOutputs } from './slot-registry.mjs';

// [2026-11-07] 이 파일이 만든 임시 폴더는 모든 시험이 끝난 뒤 지운다 — 지우지 않아 %TEMP% 에 수만 개가 쌓였다(pre-push 지연 실측). 저장소를 닫는 시험별 정리(t.after)가 먼저 끝난 뒤라 Windows 에서도 지울 수 있다. 다른 프로세스가 아직 쥐고 있어 지우지 못하면 시험을 실패시키지 않고 남긴다(정리는 최선 노력이다).
const temporaryRoots = [];
function temporaryDirectory(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}
after(() => {
  for (const root of temporaryRoots.splice(0)) {
    try { fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 }); } catch { /* 최선 노력 */ }
  }
});

const row = (id, text = id) => `| ${id} | accepted | ${text} |`;
const conflict = ({ ours, base, theirs }) => [
  '<<<<<<< HEAD', ...ours,
  ...(base ? ['||||||| merged common ancestors', ...base] : []),
  '=======', ...theirs,
  '>>>>>>> origin/main',
];

test('decision rows from both sides are kept and ordered by numeric ID', () => {
  const text = ['# 결정', '', row('DEC-OPS-9'), ...conflict({
    ours: [row('DEC-OPS-11')], base: [], theirs: [row('DEC-OPS-10')],
  }), ''].join('\n');
  assert.equal(resolveMemoryTableConflicts(text, { order: 'id' }),
    ['# 결정', '', row('DEC-OPS-9'), row('DEC-OPS-10'), row('DEC-OPS-11'), ''].join('\n'));
  assert.ok(compareRowIds('DEC-OPS-9', 'DEC-OPS-10') < 0, 'IDs compare numerically, not as text');
});

test('gap rows keep existing order and append the other side at the end', () => {
  const text = conflict({ ours: [row('GAP-Z-001'), row('GAP-A-001')], base: [row('GAP-Z-001')], theirs: [row('GAP-Z-001'), row('GAP-M-001')] }).join('\n');
  assert.deepEqual(resolveMemoryTableConflicts(text, { order: 'keep' }).split('\n'),
    [row('GAP-Z-001'), row('GAP-A-001'), row('GAP-M-001')]);
});

test('a row changed on one side only takes that change; a row deleted on one side stays deleted', () => {
  const text = conflict({
    ours: [row('GAP-A-001', 'ours edit'), row('GAP-B-001')],
    base: [row('GAP-A-001'), row('GAP-B-001'), row('GAP-C-001')],
    theirs: [row('GAP-A-001'), row('GAP-B-001', 'theirs edit'), row('GAP-C-001')],
  }).join('\r\n');
  assert.equal(resolveMemoryTableConflicts(text, { order: 'keep' }),
    [row('GAP-A-001', 'ours edit'), row('GAP-B-001', 'theirs edit')].join('\r\n'), 'CRLF is preserved');
});

test('the same ID edited differently on both sides is not merged by the tool', () => {
  const text = conflict({ ours: [row('GAP-A-001', 'x')], base: [row('GAP-A-001')], theirs: [row('GAP-A-001', 'y')] }).join('\n');
  assert.throws(() => resolveMemoryTableConflicts(text, { order: 'keep' }), /GAP-A-001.*한 행으로 합쳐야/);
});

test('the same new ID written by both sides must be renumbered by a person', () => {
  const text = conflict({ ours: [row('DEC-OPS-178', 'ours')], base: [], theirs: [row('DEC-OPS-178', 'theirs')] }).join('\n');
  assert.throws(() => resolveMemoryTableConflicts(text, { order: 'id' }), /같은 새 ID\(DEC-OPS-178\)/);
  const twoWay = conflict({ ours: [row('DEC-OPS-178', 'ours')], theirs: [row('DEC-OPS-178', 'theirs')] }).join('\n');
  assert.throws(() => resolveMemoryTableConflicts(twoWay, { order: 'id' }), /같은 새 ID/, 'without a base section');
});

test('prose or blank lines inside a conflict are left to a person', () => {
  for (const stray of ['', '문단 설명', '## 제목']) {
    const text = conflict({ ours: [row('GAP-A-001'), stray], base: [], theirs: [row('GAP-B-001')] }).join('\n');
    assert.throws(() => resolveMemoryTableConflicts(text, { order: 'keep' }), /표 행이 아닌 줄/, JSON.stringify(stray));
  }
  assert.throws(() => resolveMemoryTableConflicts(['<<<<<<< HEAD', row('GAP-A-001')].join('\n'), { order: 'keep' }),
    /닫히지 않은/);
});

test('conflict markers are found by line, markdown rules are not mistaken for them', () => {
  assert.deepEqual(findConflictMarkers(['제목', '=======', '| a |', '<<<<<<< HEAD', '||||||| base', '>>>>>>> main'].join('\n')), [4, 5, 6]);
  assert.deepEqual(findConflictMarkers('<<<<<<<< 여덟 개\n>>>>>>>x'), []);
});

test('the URL approval is never rewritten by regeneration: no generator writes or touches it', () => {
  // 승인은 사람이 고른 기록 ID 다(DEC-OPS-403 ②). census 해시 재결속을 걷은 뒤(DEC-OPS-420) 생성기가 이 파일을 쓰면 승인이 조용히 바뀐다.
  assert.ok(GENERATORS.every(generator => ![...generator.outputs, ...(generator.touches ?? [])].includes('config/ui-url-state-approval.json')));
});

test('only generators whose inputs or outputs changed on both sides run, downstream steps follow', () => {
  const ids = files => planRegeneration(files).map(generator => generator.id);
  assert.deepEqual(ids({ ours: ['frontend/src/a.tsx'], theirs: ['frontend/src/b.tsx'] }),
    ['boundary-census', 'screen-registry', 'url-state-census', 'atlas']);
  assert.deepEqual(ids({ ours: ['api-docs.json'], theirs: ['api-docs.json'] }),
    ['sync-contract', 'boundary-census', 'screen-registry', 'url-state-census', 'atlas'], 'regenerated contracts feed the censuses');
  assert.deepEqual(ids({ ours: ['config/governance/permission-catalog.json'], theirs: ['config/governance/authorization-policies.json'] }),
    ['permissions', 'boundary-census', 'screen-registry', 'url-state-census', 'atlas'], 'the generated permission module is a frontend source');
  assert.deepEqual(ids({ ours: ['config/ui-route-capabilities.json'], theirs: ['config/project-composer-menus.json'] }),
    ['screen-registry', 'url-state-census', 'atlas'], 'the screen registry is a frontend source the URL census scans');
  assert.deepEqual(ids({ ours: ['frontend/src/types/generated-screen-registry.ts'], theirs: ['frontend/src/types/generated-screen-registry.ts'] }),
    ['boundary-census', 'screen-registry', 'url-state-census', 'atlas'], 'a conflicted registry is regenerated, not picked');
  assert.deepEqual(ids({ ours: ['api-docs.json'], theirs: ['docs/a.md'] }), ['atlas'],
    'a contract changed on one side only is already consistent');
  assert.deepEqual(ids({ ours: ['frontend/atlas/atlas.css'], theirs: ['frontend/atlas/atlas.css'] }),
    ['atlas']);
  assert.deepEqual(ids({ ours: ['config/governance/permission-bundles.json'], theirs: ['config/ui-route-capabilities.json'] }),
    ['screen-registry', 'url-state-census', 'atlas'], 'the permission bundle ledger feeds the screen registry');
  assert.deepEqual(ids({ ours: ['config/frontend-visible-terms.json'], theirs: ['config/governance/permission-bundles.json'] }),
    ['screen-registry', 'url-state-census', 'atlas'], 'the visible terms ledger checks the bundle copy the registry writes');
});

test('slot contributions changed on both sides regenerate the slot registries before the censuses that scan them', () => {
  // 슬롯 레지스트리(슬롯 단계 PR-4)도 frontend/src 의 소스다 — 다시 만든 레지스트리를 census 들이 읽는다.
  const ids = files => planRegeneration(files).map(generator => generator.id);
  assert.deepEqual(ids({ ours: ['frontend/src/extensions/addressbook/recipient-picker-sources.ts'],
    theirs: ['frontend/src/extensions/note/recipient-picker-sources.ts'] }),
  ['slot-registries', 'boundary-census', 'screen-registry', 'url-state-census', 'atlas']);
  const step = GENERATORS.find(generator => generator.id === 'slot-registries');
  // 출력은 손으로 적지 않는다 — 디스크의 기여·레지스트리에서 읽는다(지금은 슬롯 세 개).
  assert.deepEqual(step.outputs, slotRegistryOutputs(path.resolve(import.meta.dirname, '..')));
  assert.ok(step.outputs.includes('frontend/src/extensions/generated-recipient-picker-sources.ts'));
  assert.ok(planRegeneration({ ours: [step.outputs[0]], theirs: [step.outputs[0]] }).some(generator => generator.id === 'slot-registries'),
    'a conflicted registry is regenerated, not picked');
});

test('config/modules is the source after the v2 transition — no generator rewrites a feature file', () => {
  // 11단계 C7 전환 뒤 기능 파일은 손으로 쓰는 원천이다. 양쪽이 같은 기능 파일을 고친 충돌은 다시 만들지 않고 사람이 합친다.
  const ids = files => planRegeneration(files).map(generator => generator.id);
  assert.deepEqual(ids({ ours: ['config/modules/board.json'], theirs: ['config/modules/board.json'] }), ['atlas'],
    'a conflicted feature file is resolved by hand, not regenerated');
  assert.ok(GENERATORS.every(generator => generator.outputs.every(output => !output.startsWith('config/modules/'))),
    'no generator writes the feature files');
  assert.equal(GENERATORS.some(generator => generator.id === 'composer-modules'), false);
});

test('the screen-registry step reads every input the generator declares and writes its output', () => {
  // 생성기에 입력을 더하고 여기를 잊으면, 그 입력만 양쪽이 바꾼 병합에서 화면 목록이 낡은 채 stage 된다.
  const step = GENERATORS.find(generator => generator.id === 'screen-registry');
  assert.ok(step, 'the screen-registry step exists');
  for (const [name, file] of Object.entries(SCREEN_REGISTRY_INPUTS)) assert.ok(step.inputs(file), `${name}: ${file}`);
  assert.deepEqual(step.outputs, [SCREEN_REGISTRY_OUTPUT]);
});

// ------------------------------------------------------------------ 실제 git 병합

function repo() {
  const dir = temporaryDirectory('merge-main-regenerate-');
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr}`);
    return result.stdout;
  };
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'test');
  git('config', 'core.autocrlf', 'false');
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), text);
  };
  return { dir, git, write, read: file => fs.readFileSync(path.join(dir, file), 'utf8') };
}

const fakeGenerator = {
  id: 'fake-census',
  inputs: file => file.startsWith('src/'),
  outputs: ['census.txt'],
  command: ['node', ['-e', "const fs=require('fs');fs.writeFileSync('census.txt', fs.readdirSync('src').sort().join(',')+'\\n')"]],
};

function divergedRepo({ decisionsOurs, decisionsTheirs, extra = () => {}, file = '.agent/memory/decisions.md' }) {
  const r = repo();
  r.write(file, `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n`);
  r.write('src/a.ts', 'a\n');
  r.write('census.txt', 'a.ts\n');
  r.git('add', '-A');
  r.git('commit', '-qm', 'base');
  r.git('checkout', '-qb', 'feature');
  r.write(file, `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${decisionsOurs}\n`);
  r.write('src/b.ts', 'b\n');
  r.write('census.txt', 'a.ts,b.ts\n');
  r.git('add', '-A');
  r.git('commit', '-qm', 'ours');
  r.git('checkout', '-q', 'main');
  r.write(file, `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${decisionsTheirs}\n`);
  r.write('src/c.ts', 'c\n');
  r.write('census.txt', 'a.ts,c.ts\n');
  extra(r);
  r.git('add', '-A');
  r.git('commit', '-qm', 'theirs');
  r.git('checkout', '-q', 'feature');
  return r;
}

test('a real merge resolves memory rows and generated conflicts, regenerates, stages, and does not commit', () => {
  const r = divergedRepo({ decisionsOurs: row('DEC-OPS-3'), decisionsTheirs: row('DEC-OPS-2') });
  const messages = [];
  const result = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: m => messages.push(m) });
  assert.equal(result.status, 'ready', messages.join('\n'));
  assert.deepEqual(result.resolved.sort(), ['.agent/memory/decisions.md', 'census.txt']);
  assert.equal(r.read('.agent/memory/decisions.md'),
    `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${row('DEC-OPS-2')}\n${row('DEC-OPS-3')}\n`);
  assert.equal(r.read('census.txt'), 'a.ts,b.ts,c.ts\n', 'the generated file is rebuilt from both inputs, not picked');
  assert.equal(r.git('status', '--porcelain').trim().split('\n').filter(line => !/^[MA] /.test(line)).length, 0, 'everything is staged');
  assert.ok(fs.existsSync(path.join(r.dir, '.git', 'MERGE_HEAD')), 'the merge is left for the person to review and commit');
  assert.equal(r.git('rev-list', '--count', 'HEAD').trim(), '2');
});

// 공용 결정 인덱스(decisions.md)와 활성 gap 인덱스(known-gaps.md)만 행 단위 병합 테이블에 둔다(DEC-OPS-435).
test('memory tables merge decisions in ID order and known-gaps in append order', () => {
  assert.deepEqual(MEMORY_TABLES.get('.agent/memory/decisions.md'), { order: 'id' });
  assert.deepEqual(MEMORY_TABLES.get('.agent/memory/known-gaps.md'), { order: 'keep' });
  assert.equal(MEMORY_TABLES.size, 2);
  const file = '.agent/memory/known-gaps.md';
  const r = divergedRepo({ decisionsOurs: row('GAP-Z-002'), decisionsTheirs: row('GAP-A-002'), file });
  const messages = [];
  const result = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: m => messages.push(m) });
  assert.equal(result.status, 'ready', messages.join('\n'));
  assert.ok(result.resolved.includes(file), result.resolved.join(', '));
  assert.equal(r.read(file), `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${row('GAP-Z-002')}\n${row('GAP-A-002')}\n`);
});

test('a generator whose tool is absent from the repository is skipped with a message, not run', () => {
  const r = divergedRepo({ decisionsOurs: row('DEC-OPS-3'), decisionsTheirs: row('DEC-OPS-2') });
  const absent = { id: 'absent-tool', requires: 'tools/absent.mjs', inputs: () => true, outputs: ['absent.txt'],
    command: ['node', ['-e', 'process.exit(1)']] };
  const present = { id: 'present-tool', requires: 'src/a.ts', inputs: () => true, outputs: ['present.txt'],
    command: ['node', ['-e', "require('fs').writeFileSync('present.txt', 'x')"]] };
  const messages = [];
  const result = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator, absent, present],
    log: m => messages.push(m) });
  assert.equal(result.status, 'ready', messages.join('\n'));
  assert.deepEqual(result.plan, ['fake-census', 'present-tool'], 'only the generator whose tool is missing is skipped');
  assert.ok(messages.some(m => m.includes('건너뜀: absent-tool')), messages.join('\n'));
  // 원본 저장소는 Atlas 생성기를 갖고 있어 Atlas 재생성을 건너뛰지 않는다.
  const atlas = GENERATORS.find(generator => generator.id === 'atlas');
  assert.ok(fs.existsSync(new URL(`../${atlas.requires}`, import.meta.url)), atlas.requires);
});

test('a conflict the tool must not decide stops before regeneration and resumes with --continue', () => {
  const r = divergedRepo({
    decisionsOurs: row('DEC-OPS-2', 'ours'), decisionsTheirs: row('DEC-OPS-2', 'theirs'),
  });
  const first = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} });
  assert.equal(first.status, 'manual');
  assert.deepEqual(first.manual.map(item => item.file), ['.agent/memory/decisions.md']);
  assert.match(first.manual[0].reason, /같은 새 ID\(DEC-OPS-2\)/);
  assert.equal(r.read('census.txt'), 'a.ts,c.ts\n', 'a conflicted generated file holds one side until regeneration after the person resolves');

  assert.throws(() => mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} }),
    /이미 병합이 진행 중/);
  r.write('.agent/memory/decisions.md', `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${row('DEC-OPS-2', 'theirs')}\n${row('DEC-OPS-3', 'ours')}\n`);
  r.git('add', '.agent/memory/decisions.md');
  const resumed = mergeMainAndRegenerate({ cwd: r.dir, resume: true, generators: [fakeGenerator], log: () => {} });
  assert.equal(resumed.status, 'ready');
  assert.equal(r.read('census.txt'), 'a.ts,b.ts,c.ts\n');
});

test('an unrelated source conflict is reported, and leftover markers fail the run', () => {
  const r = divergedRepo({
    decisionsOurs: row('DEC-OPS-3'), decisionsTheirs: row('DEC-OPS-2'),
    extra: repoState => repoState.write('src/a.ts', 'theirs\n'),
  });
  r.git('checkout', '-q', 'main');
  r.git('checkout', '-q', 'feature');
  r.write('src/a.ts', 'ours\n');
  r.git('commit', '-qam', 'ours a');
  const first = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} });
  assert.deepEqual(first.manual.map(item => item.file), ['src/a.ts']);
  r.git('add', 'src/a.ts');
  assert.throws(() => mergeMainAndRegenerate({ cwd: r.dir, resume: true, generators: [fakeGenerator], log: () => {} }),
    /충돌 표기가 남아 있다: src\/a\.ts/);
});

test('no generator rewrites the retired harness manifest', () => {
  // 원본은 manifest 를 두지 않는다(DEC-OPS-420). 생성기 출력으로 두면 걷은 파일이 재생성으로 되살아난다.
  assert.ok(GENERATORS.every(generator => ![...generator.outputs, ...(generator.touches ?? [])].includes(HARNESS_MANIFEST)));
});

function manifestDivergedRepo(ours, theirs, { otherConflict = false } = {}) {
  const r = repo();
  r.write(HARNESS_MANIFEST, '# 머리\nk=0\nother=1\n');
  r.write('src/a.ts', 'a\n');
  r.git('add', '-A');
  r.git('commit', '-qm', 'base');
  r.git('checkout', '-qb', 'feature');
  ours(r);
  if (otherConflict) r.write('src/a.ts', 'ours\n');
  r.git('commit', '-qam', 'ours');
  r.git('checkout', '-q', 'main');
  theirs(r);
  if (otherConflict) r.write('src/a.ts', 'theirs\n');
  r.git('commit', '-qam', 'theirs');
  r.git('checkout', '-q', 'feature');
  return r;
}

test('a branch that still edits the retired harness manifest merges by deleting it, as main did', () => {
  // main 이 manifest 를 걷은 뒤(DEC-OPS-420) 그 전에 갈라진 브랜치가 고친 manifest 는 수정/삭제 충돌이 된다 — 지워서 푼다.
  const r = manifestDivergedRepo(repoState => repoState.write(HARNESS_MANIFEST, '# 머리\nk=1\nother=1\n'),
    repoState => repoState.git('rm', '-q', HARNESS_MANIFEST));
  const result = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} });
  assert.equal(result.status, 'ready');
  assert.ok(result.resolved.includes(HARNESS_MANIFEST));
  assert.equal(fs.existsSync(path.join(r.dir, HARNESS_MANIFEST)), false);
});

test('a same-key conflict on the retired harness manifest is also resolved by deletion while other conflicts stay manual', () => {
  const r = manifestDivergedRepo(repoState => repoState.write(HARNESS_MANIFEST, '# 머리\nk=1\nother=1\n'),
    repoState => repoState.write(HARNESS_MANIFEST, '# 머리\nk=2\nother=1\n'), { otherConflict: true });
  const result = mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} });
  assert.equal(result.status, 'manual');
  assert.deepEqual(result.manual.map(item => item.file), ['src/a.ts']);
  assert.ok(result.resolved.includes(HARNESS_MANIFEST));
  assert.equal(fs.existsSync(path.join(r.dir, HARNESS_MANIFEST)), false);
});

test('uncommitted work is never mixed into the merge', () => {
  const r = divergedRepo({ decisionsOurs: row('DEC-OPS-3'), decisionsTheirs: row('DEC-OPS-2') });
  r.write('src/a.ts', 'wip\n');
  assert.throws(() => mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} }),
    /커밋하지 않은 변경/);
  assert.ok(!fs.existsSync(path.join(r.dir, '.git', 'MERGE_HEAD')));
});
