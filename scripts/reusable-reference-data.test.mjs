import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { requiresClosure, sourceOwner, stripComments } from './project-composer-integrations.mjs';
import { domainSupportFiles } from './project-composer-source.mjs';
import {
  BOARD_MASTER_SEED, BOARD_MASTER_TABLE, CODE_GROUP_OWNERS, CODE_GROUP_TABLE, boardMasterIds, omitCodeGroupsSql, referenceDataPlan,
} from './reusable-reference-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const JAVA_ROOTS = ['foundation/src/main/java', 'business-core/src/main/java', 'business-app/src/main/java', 'api-server/src/main/java'];

function javaFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? javaFiles(path) : entry.name.endsWith('.java') ? [path] : [];
  });
}

test('code group owners match the capability that owns every production file reading that group', () => {
  // 카탈로그와 같은 소유 판정(지원 파일 선언 → 업무 앱 디렉터리 → foundation·business-core 는 core → 참조 패키지)을 쓴다.
  const catalog = loadProjectComposerCatalog(root);
  const manifest = JSON.parse(readFileSync(join(root, 'config/reusable-base-profiles.json'), 'utf8'));
  const supportOwners = new Map([...domainSupportFiles(root, manifest)].flatMap(([domain, files]) => files.map(file => [file, domain])));
  const ownerOf = sourceOwner(supportOwners, catalog.capabilities.map(capability => capability.id), requiresClosure(catalog.capabilities));
  const readers = new Map();
  for (const javaRoot of JAVA_ROOTS) for (const absolute of javaFiles(join(root, javaRoot))) {
    const source = readFileSync(absolute, 'utf8');
    const groups = [...new Set([...stripComments(source).matchAll(/"(COM\d{3})"/g)].map(match => match[1]))];
    if (!groups.length) continue;
    const path = relative(root, absolute).split(sep).join('/');
    const owner = ownerOf(path, stripComments(source, { strings: false }));
    for (const group of groups) readers.set(group, [...(readers.get(group) ?? []), { path, owner }]);
  }
  const mismatches = [...readers].flatMap(([group, files]) => files
    .filter(file => file.owner !== (CODE_GROUP_OWNERS[group] ?? 'core'))
    .map(file => `${group}: ${file.path} 는 ${file.owner} 소유인데 표는 ${CODE_GROUP_OWNERS[group] ?? 'core'}`));
  assert.deepEqual(mismatches, []);
  // 표의 그룹은 생산 코드가 실제로 읽는다(읽는 곳이 사라진 선언을 남기지 않는다).
  assert.deepEqual(Object.keys(CODE_GROUP_OWNERS).filter(group => !readers.has(group)), []);
  // 빈 스캔은 통과가 아니다 — 2026-10-10 실측 core 그룹(COM033)과 표의 세 그룹을 읽는다.
  assert.ok(readers.has('COM033') && readers.size >= 4, `읽힌 코드 그룹: ${[...readers.keys()].join(', ')}`);
  // 표의 소유자는 실제 기능이다.
  for (const owner of Object.values(CODE_GROUP_OWNERS)) assert.ok(catalog.capabilities.some(capability => capability.id === owner), owner);
});

test('the board master seed only inserts board masters and its IDs are read back exactly', () => {
  const seed = readFileSync(join(root, BOARD_MASTER_SEED), 'utf8');
  const code = stripComments(seed, { kind: 'sql' });
  const targets = [...new Set([...code.matchAll(/\bINSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map(match => match[1].toLowerCase()))];
  // 참조 데이터 덤프는 공통코드 그룹과 게시판 마스터 표만 담는다. 이 시드가 다른 표에 쓰면 그 행이 번들에서 조용히 빠진다.
  assert.deepEqual(targets, [BOARD_MASTER_TABLE]);
  assert.deepEqual(boardMasterIds(seed), ['BBSMSTR_AAAAAAAAAAAA', 'BBSMSTR_CCCCCCCCCCCC', 'BBSMSTR_DDDDDDDDDDDD', 'BBSMSTR_EEEEEEEEEEEE']);
  assert.throws(() => boardMasterIds('SELECT 1;'), /BBSMSTR_/);
});

test('the reference data plan keeps core groups and only the selected capabilities’ groups and board masters', () => {
  const full = referenceDataPlan(['board', 'informalsanction', 'note'], [CODE_GROUP_TABLE, BOARD_MASTER_TABLE, 'tb_note']);
  assert.deepEqual(full, { omittedCodeGroups: [], includeBoardMasters: true, tables: [CODE_GROUP_TABLE, BOARD_MASTER_TABLE] });
  assert.equal(omitCodeGroupsSql(full), '');

  const core = referenceDataPlan([], [CODE_GROUP_TABLE]);
  assert.deepEqual(core, { omittedCodeGroups: ['COM004', 'COM009', 'COM075'], includeBoardMasters: false, tables: [CODE_GROUP_TABLE] });
  assert.equal(omitCodeGroupsSql(core), "DELETE FROM public.tb_com_cd WHERE cd_id IN ('COM004', 'COM009', 'COM075');");

  const approvalOnly = referenceDataPlan(['informalsanction'], [CODE_GROUP_TABLE]);
  assert.deepEqual(approvalOnly.omittedCodeGroups, ['COM004', 'COM009']);

  // 게시판 기능과 게시판 마스터 표는 함께 있거나 함께 없다.
  assert.throws(() => referenceDataPlan(['board'], [CODE_GROUP_TABLE]), /어긋난다/);
  assert.throws(() => referenceDataPlan([], [CODE_GROUP_TABLE, BOARD_MASTER_TABLE]), /어긋난다/);
  // 공통코드 그룹 표는 core 라 늘 있다.
  assert.throws(() => referenceDataPlan([], []), /core 테이블/);
  assert.throws(() => omitCodeGroupsSql({ omittedCodeGroups: ["X'); DROP TABLE t; --"] }), /올바르지 않다/);
});
