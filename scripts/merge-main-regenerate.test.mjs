import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  GENERATORS,
  compareRowIds,
  findConflictMarkers,
  mergeMainAndRegenerate,
  planRegeneration,
  rebindApprovalText,
  resolveHashOnlyConflicts,
  resolveMemoryTableConflicts,
  urlCensusSha256,
} from './merge-main-regenerate.mjs';
import { SCREEN_REGISTRY_INPUTS, SCREEN_REGISTRY_OUTPUT } from './generate-screen-registry.mjs';

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

test('the approval file resolves only when the conflict is the bound hash line', () => {
  const hash = char => `    "sha256": "${char.repeat(64)}"`;
  const approval = ['{', '  "manifestRef": {', ...conflict({ ours: [hash('a')], base: [hash('0')], theirs: [hash('b')] }), '  }', '}'].join('\n');
  assert.equal(resolveHashOnlyConflicts(approval), ['{', '  "manifestRef": {', hash('a'), '  }', '}'].join('\n'));
  const classes = ['{', ...conflict({ ours: ['  "reviewer": "a"'], theirs: ['  "reviewer": "b"'] }), '}'].join('\n');
  assert.equal(resolveHashOnlyConflicts(classes), null, 'approval entries are never picked by the tool');
});

test('the approval hash is rebound to the canonical census serialization only', () => {
  const census = '{\r\n  "records": [1]\r\n}\r\n';
  const approval = `{\n  "manifestRef": {\n    "path": "config/ui-url-state-census.json",\n    "sha256": "${'0'.repeat(64)}"\n  },\n  "classes": []\n}\n`;
  const rebound = rebindApprovalText(approval, census);
  assert.equal(JSON.parse(rebound).manifestRef.sha256, urlCensusSha256(census));
  assert.equal(rebound.replace(urlCensusSha256(census), '0'.repeat(64)), approval, 'nothing but the hash changes');
  assert.throws(() => rebindApprovalText(approval.replace('ui-url-state-census', 'other'), census), /manifestRef/);
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
  assert.deepEqual(ids({ ours: ['frontend/public/governance_harness_atlas.html'], theirs: ['frontend/public/governance_harness_atlas.html'] }),
    ['atlas']);
  assert.deepEqual(ids({ ours: ['config/governance/permission-bundles.json'], theirs: ['config/ui-route-capabilities.json'] }),
    ['screen-registry', 'url-state-census', 'atlas'], 'the permission bundle ledger feeds the screen registry');
  assert.deepEqual(ids({ ours: ['config/frontend-visible-terms.json'], theirs: ['config/governance/permission-bundles.json'] }),
    ['screen-registry', 'url-state-census', 'atlas'], 'the visible terms ledger checks the bundle copy the registry writes');
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-main-regenerate-'));
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

function divergedRepo({ decisionsOurs, decisionsTheirs, extra = () => {} }) {
  const r = repo();
  r.write('.agent/memory/decisions.md', `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n`);
  r.write('src/a.ts', 'a\n');
  r.write('census.txt', 'a.ts\n');
  r.git('add', '-A');
  r.git('commit', '-qm', 'base');
  r.git('checkout', '-qb', 'feature');
  r.write('.agent/memory/decisions.md', `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${decisionsOurs}\n`);
  r.write('src/b.ts', 'b\n');
  r.write('census.txt', 'a.ts,b.ts\n');
  r.git('add', '-A');
  r.git('commit', '-qm', 'ours');
  r.git('checkout', '-q', 'main');
  r.write('.agent/memory/decisions.md', `| ID | 결정 |\n|---|---|\n${row('DEC-OPS-1')}\n${decisionsTheirs}\n`);
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

test('uncommitted work is never mixed into the merge', () => {
  const r = divergedRepo({ decisionsOurs: row('DEC-OPS-3'), decisionsTheirs: row('DEC-OPS-2') });
  r.write('src/a.ts', 'wip\n');
  assert.throws(() => mergeMainAndRegenerate({ cwd: r.dir, base: 'main', fetch: false, generators: [fakeGenerator], log: () => {} }),
    /커밋하지 않은 변경/);
  assert.ok(!fs.existsSync(path.join(r.dir, '.git', 'MERGE_HEAD')));
});
