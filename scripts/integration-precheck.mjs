#!/usr/bin/env node
/**
 * 여러 갈래(브랜치)를 한 브랜치로 합친 뒤, 푸시 전에 도는 표준 점검의 판정부 — `npm run verify:integrate`(scripts/verify.mjs integrate)가
 * 부른다(오케스트레이션 프로토콜 §6.4). 2026-10 의 통합 PR(#930·#943)은 텍스트 충돌이 없는 의미 상호작용 — 두 갈래가 같은 Flyway 번호를
 * 쓰거나, 퇴역 마이그레이션이 다른 갈래의 옛 스키마 시험을 깨거나, 규약 변경이 다른 갈래의 시험을 깨는 것 — 을 CI 에서 처음 봤다.
 *
 * 순서:
 *   ① (기본 모드) 기준(기본 origin/main)과 작업 트리 사이의 Flyway 버전 중복·충돌을 막고, 메뉴 스냅숏이 낡았으면 갱신 명령을 알린다.
 *   ② `npm run regen` — 통합 트리에서 생성물을 한 번 다시 만든다(verify.mjs 가 부른다).
 *   ③ 훅이 보지 않는 무거운 시험 — 전체 vitest 와 `:api-server:test`(verify.mjs 가 부른다), 그리고 `--run-selected` 가 고르는 것:
 *      바뀐 마이그레이션·엔티티가 닿는 schema-validation 시험(표 이름·버전을 원문에 쓰는 시험, 고를 수 없으면 전체)과,
 *      카탈로그·생성기 화면 입력이 바뀌었으면 `node --test tools/project-composer/ui.test.mjs`.
 * 운영 계약과 정적 검사는 곧 pre-push 가 같은 커밋에서 돈다(§6.2) — 여기서 되풀이하지 않는다. 판정 규칙은 integration-precheck.test.mjs 가
 * 고정한다.
 *
 * 사용법: node scripts/integration-precheck.mjs [--base <ref>]            # ① (기본 origin/main — 먼저 fetch 해 두라)
 *         node scripts/integration-precheck.mjs --run-selected [--base <ref>]  # ③ 의 선별 시험
 *         node scripts/integration-precheck.mjs --plan [--base <ref>]           # ③ 의 선별 결과만 보인다(실행하지 않는다)
 */
import { execFileSync, execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { platform } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const MIGRATION_DIRECTORY = 'api-server/src/main/resources/db/migration';
export const DEFAULT_BASE = 'origin/main';
const GATE_REGISTRY = 'config/governance/gates.json';
const MENU_SNAPSHOT = 'config/project-composer-menus.json';
export const COMPOSER_UI_TEST = 'node --test tools/project-composer/ui.test.mjs';
/** 생성기 화면 시험(ui.test.mjs)이 실행하는 카탈로그·화면의 입력. 이 접두의 파일이 바뀌면 그 시험을 돈다. */
export const COMPOSER_UI_INPUTS = Object.freeze([
  'config/modules/', 'config/project-composer-menus.json', 'tools/project-composer/',
  'scripts/project-composer', 'scripts/composer-modules', 'scripts/verify-reusable-artifact',
]);

// ─── ① Flyway 버전 ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Flyway 파일 이름 — { kind: 'V'|'R', version: [정수…] | null, text }. Flyway 이름이 아니면 null. */
export function parseMigrationName(name) {
  const versioned = /^V(\d+(?:[._]\d+)*)__.+\.sql$/u.exec(name);
  if (versioned) return { kind: 'V', version: versioned[1].split(/[._]/u).map(Number), text: versioned[1].replaceAll('_', '.') };
  if (/^R__.+\.sql$/u.test(name)) return { kind: 'R', version: null, text: null };
  return null;
}

/** 버전 비교 — 자리마다 수로 비교하고 모자란 자리는 0 이다(Flyway 와 같다: 2.5 = 2.05 = 2.5.0). */
export function compareVersions(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

/**
 * 기준(baseNames)과 작업 트리(headNames)의 마이그레이션 파일 이름, 그리고 기준 대비 바뀐 마이그레이션(changes: { status: A|M|D, name })으로
 * Flyway 가 받지 않을 상태를 찾는다. 반복 마이그레이션(R__)은 고쳐도 된다.
 * - 같은 버전이 둘이다(두 갈래가 같은 번호를 썼다 — #943 의 V2_135).
 * - 새 버전이 기준의 최신 버전보다 크지 않다(이미 기준까지 적용한 공유 DB 는 순서 밖 마이그레이션을 거부한다 — outOfOrder 꺼짐).
 * - 기준에 있는 버전 마이그레이션을 고치거나 지웠다(적용된 마이그레이션의 체크섬이 바뀐다).
 */
export function flywayConflicts({ baseNames, headNames, changes }) {
  const errors = [];
  const versioned = (names) => names.map((name) => ({ name, parsed: parseMigrationName(name) })).filter(({ parsed }) => parsed?.kind === 'V');
  const head = versioned(headNames);
  const byVersion = new Map();
  for (const { name, parsed } of head) {
    const key = parsed.version.join('.').replace(/(?:\.0)+$/u, '');
    byVersion.set(key, [...(byVersion.get(key) ?? []), name]);
  }
  for (const [version, names] of byVersion) {
    if (names.length > 1) errors.push(`Flyway 버전 ${version} 이 둘 이상입니다: ${names.sort().join(', ')} — 나중에 합친 갈래의 번호를 기준의 최신 다음으로 바꾸십시오.`);
  }
  const base = versioned(baseNames);
  const latest = base.reduce((max, { parsed }) => (max && compareVersions(max.version, parsed.version) >= 0 ? max : parsed), null);
  const baseSet = new Set(baseNames);
  for (const { status, name } of changes) {
    const parsed = parseMigrationName(name);
    if (parsed?.kind !== 'V') continue;
    if (status === 'A' && !baseSet.has(name) && latest && compareVersions(parsed.version, latest.version) <= 0) {
      errors.push(`${name}: 새 마이그레이션이 기준의 최신 버전(${latest.text})보다 크지 않습니다 — 그 버전까지 적용한 DB 는 순서 밖 마이그레이션을 받지 않습니다.`);
    }
    if (status === 'M' && baseSet.has(name)) errors.push(`${name}: 기준에 있는 마이그레이션을 고쳤습니다 — 적용된 마이그레이션은 바꾸지 말고 새 버전을 더하십시오.`);
    if (status === 'D' && baseSet.has(name)) errors.push(`${name}: 기준에 있는 마이그레이션을 지웠습니다 — 적용된 마이그레이션은 지우지 않습니다.`);
  }
  return errors;
}

const git = (root, args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** 기준 ref 와 작업 트리(커밋하지 않은 변경과 추적하지 않는 새 파일 포함) 사이에서 바뀐 파일 — { status, path }. */
export function workingTreeChanges(root, base) {
  const changes = git(root, ['diff', '--no-renames', '--name-status', '-z', base, '--']).split('\0').filter(Boolean);
  const rows = [];
  for (let index = 0; index + 1 < changes.length; index += 2) rows.push({ status: changes[index][0], path: changes[index + 1] });
  for (const path of git(root, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) {
    if (!rows.some((row) => row.path === path)) rows.push({ status: 'A', path });
  }
  return rows;
}

/** ① — Flyway 충돌 오류와 메뉴 스냅숏 안내. menus=false 면 메뉴 스냅숏을 보지 않는다(시험용 임시 저장소). */
export async function integrationPrecheck(root = REPO_ROOT, base = DEFAULT_BASE, { menus = true } = {}) {
  git(root, ['rev-parse', '--verify', '--quiet', `${base}^{commit}`]);
  const baseNames = git(root, ['ls-tree', '--name-only', `${base}:${MIGRATION_DIRECTORY}`]).split('\n').filter(Boolean);
  const changes = workingTreeChanges(root, base);
  const migrationChanges = changes.filter(({ path }) => path.startsWith(`${MIGRATION_DIRECTORY}/`) && !path.slice(MIGRATION_DIRECTORY.length + 1).includes('/'))
    .map(({ status, path }) => ({ status, name: path.slice(MIGRATION_DIRECTORY.length + 1) }));
  const headNames = [...new Set([...baseNames.filter((name) => !migrationChanges.some((change) => change.name === name && change.status === 'D')),
    ...migrationChanges.filter(({ status }) => status !== 'D').map(({ name }) => name)])];
  const errors = flywayConflicts({ baseNames, headNames, changes: migrationChanges });
  const notices = [];
  if (menus && migrationChanges.length) {
    const { projectMenuSourceHash } = await import('./project-composer-menu-preview.mjs');
    const snapshot = JSON.parse(readFileSync(join(root, MENU_SNAPSHOT), 'utf8'));
    if (snapshot.sourceMigrationHash !== projectMenuSourceHash(root)) {
      notices.push('메뉴 스냅숏이 마이그레이션을 따라가지 못했습니다(MENU_SNAPSHOT_STALE) — 바뀐 마이그레이션이 메뉴 inventory 에 닿습니다. '
        + '`npm run project:menus:refresh`(일회용 PostgreSQL, 무거운 실행)로 다시 만든 뒤 regen 하십시오.');
    }
  }
  return { errors, notices, migrationChanges };
}

// ─── ③ 무거운 시험의 선별 ─────────────────────────────────────────────────────────────────────────────────────────

/** SQL 원문이 쓰거나 읽는 테이블 이름(소문자, 스키마 접두 없이). */
export function touchedTables(sql) {
  const text = sql.toLowerCase().replace(/--[^\n]*|\/\*[\s\S]*?\*\//gu, ' ').replaceAll('"', '');
  const tables = new Set();
  const patterns = [
    /\b(?:create|alter|drop)\s+table\s+(?:if\s+(?:not\s+)?exists\s+)?(?:only\s+)?([a-z0-9_.]+)/gu,
    /\binsert\s+into\s+([a-z0-9_.]+)/gu, /\bupdate\s+(?:only\s+)?([a-z0-9_.]+)\s+set\b/gu, /\bdelete\s+from\s+(?:only\s+)?([a-z0-9_.]+)/gu,
    /\btruncate\s+(?:table\s+)?(?:only\s+)?([a-z0-9_.]+)/gu, /\bon\s+(?:only\s+)?([a-z0-9_.]+)\s*(?:using\s+\w+\s*)?\(/gu,
    /\bcomment\s+on\s+(?:table|column)\s+([a-z0-9_.]+)/gu, /\breferences\s+([a-z0-9_.]+)/gu,
  ];
  for (const pattern of patterns) {
    for (const [, name] of text.matchAll(pattern)) {
      const parts = name.split('.');
      // COMMENT ON COLUMN 은 table.column 이다.
      const table = pattern.source.includes('comment') && parts.length >= 2 ? parts.at(-2) : parts.at(-1);
      if (/^[a-z_][a-z0-9_]*$/u.test(table)) tables.add(table);
    }
  }
  return [...tables].sort();
}

/** 엔티티 원문의 테이블 이름. @Entity 가 아니면 [], @Entity 인데 @Table(name) 을 읽지 못하면 null(고를 수 없다). */
export function entityTables(java) {
  if (!/@Entity\b/u.test(java)) return [];
  const table = /@Table\s*\(\s*(?:[^)]*?\bname\s*=\s*)?"([A-Za-z0-9_]+)"/u.exec(java);
  return table ? [table[1].toLowerCase()] : null;
}

/** 저장소 상대 경로 → 그 시험 클래스의 FQCN(Gradle --tests). */
export function testClassName(source) {
  const match = /^[a-z-]+\/src\/test\/java\/(.+)\.java$/u.exec(source);
  if (!match) throw new Error(`시험 소스가 아닙니다: ${source}`);
  return match[1].replaceAll('/', '.');
}

/**
 * ③ 의 선별. changes: { status, path }. readText(path): 작업 트리 원문. schemaSources: schema-validation 시험 소스 경로.
 * schema.mode — none(마이그레이션·엔티티 변경 없음), selected(닿는 시험), all(바뀐 것은 있는데 고를 수 없거나 닿는 시험이 없다).
 */
export function selectIntegrationChecks({ changes, readText, schemaSources }) {
  const tables = new Set();
  const versions = new Set();
  let unresolved = false;
  let touched = false;
  for (const { status, path } of changes) {
    const name = path.slice(MIGRATION_DIRECTORY.length + 1);
    if (path.startsWith(`${MIGRATION_DIRECTORY}/`) && /\.sql$/u.test(path)) {
      touched = true;
      const parsed = parseMigrationName(name);
      if (parsed?.kind === 'V') versions.add(parsed.text);
      if (status === 'D') { unresolved = true; continue; }
      const found = touchedTables(readText(path));
      if (!found.length) unresolved = true;
      for (const table of found) tables.add(table);
    } else if (/\/src\/main\/java\/.+\.java$/u.test(path) && status !== 'D') {
      const found = entityTables(readText(path));
      if (found === null) { touched = true; unresolved = true; continue; }
      if (found.length) touched = true;
      for (const table of found) tables.add(table);
    }
  }
  let schema = { mode: 'none', classes: [], reason: '바뀐 마이그레이션·엔티티가 없다' };
  if (touched) {
    const mentions = (text) => [...tables].some((table) => new RegExp(`(?<![A-Za-z0-9_])${table}(?![A-Za-z0-9_])`, 'iu').test(text))
      || [...versions].some((version) => text.includes(`V${version.replaceAll('.', '_')}`) || text.includes(`'${version}'`) || text.includes(`"${version}"`));
    const classes = schemaSources.filter((source) => mentions(readText(source))).map(testClassName).sort();
    schema = unresolved || classes.length === 0
      ? { mode: 'all', classes: [], reason: unresolved ? '테이블을 읽지 못한 마이그레이션·엔티티가 있다' : '바뀐 테이블·버전을 쓰는 시험이 없다 — 모든 replay 시험이 최신까지 올린다' }
      : { mode: 'selected', classes, reason: `테이블 ${[...tables].sort().join(', ') || '-'} · 버전 ${[...versions].sort().join(', ') || '-'} 을 쓰는 시험` };
  }
  // 다른 시험 파일(scripts/project-composer-*.test.mjs)은 화면 시험이 실행하지 않는다. 화면 시험 자신은 tools/ 접두가 고른다.
  const composerUi = changes.some(({ path }) => COMPOSER_UI_INPUTS.some((prefix) => path.startsWith(prefix))
    && !(path.startsWith('scripts/') && path.endsWith('.test.mjs')));
  return { schema, composerUi };
}

/** 선별 결과를 실행 명령으로. 클래스 이름은 FQCN 형식만 받는다(셸에 넘긴다). */
export function selectedCommands({ schema, composerUi }, { windows = platform() === 'win32' } = {}) {
  const gradlew = windows ? '.\\gradlew.bat' : './gradlew';
  const commands = [];
  if (schema.mode !== 'none') {
    for (const name of schema.classes) if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/u.test(name)) throw new Error(`시험 클래스 이름이 아닙니다: ${name}`);
    const filters = schema.mode === 'selected' ? schema.classes.map((name) => ` --tests ${name}`).join('') : '';
    commands.push(`${gradlew} :api-server:schemaValidationTest${filters} --console=plain -Dfile.encoding=UTF-8`);
  }
  if (composerUi) commands.push(COMPOSER_UI_TEST);
  return commands;
}

function schemaValidationSources(root) {
  const registry = JSON.parse(readFileSync(join(root, GATE_REGISTRY), 'utf8'));
  const rules = registry.gateSets?.find((set) => set.id === 'GATESET-SCHEMA-VALIDATION')?.rules;
  if (!Array.isArray(rules) || rules.length === 0) throw new Error(`${GATE_REGISTRY}: schema-validation 등록을 읽지 못했다`);
  return rules.map((rule) => rule.source);
}

export function integrationSelection(root = REPO_ROOT, base = DEFAULT_BASE) {
  const changes = workingTreeChanges(root, base);
  const selection = selectIntegrationChecks({
    changes, schemaSources: schemaValidationSources(root), readText: (path) => readFileSync(join(root, path), 'utf8'),
  });
  return { selection, commands: selectedCommands(selection) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const baseAt = args.indexOf('--base');
  const base = baseAt >= 0 ? args[baseAt + 1] : DEFAULT_BASE;
  if (!base || base.startsWith('-')) {
    console.error('사용법: node scripts/integration-precheck.mjs [--run-selected|--plan] [--base <ref>]');
    process.exit(2);
  }
  try {
    if (args.includes('--run-selected') || args.includes('--plan')) {
      const { selection, commands } = integrationSelection(REPO_ROOT, base);
      console.log(`[integrate] schema-validation: ${selection.schema.mode} — ${selection.schema.reason}${selection.schema.classes.length ? `\n  ${selection.schema.classes.join('\n  ')}` : ''}`);
      console.log(`[integrate] 생성기 화면 시험: ${selection.composerUi ? '돈다(카탈로그·생성기 화면 입력이 바뀌었다)' : '건너뛴다(입력 변경 없음)'}`);
      if (args.includes('--run-selected')) {
        for (const command of commands) {
          console.log(`\n▶ ${command}`);
          execSync(command, { cwd: REPO_ROOT, stdio: 'inherit', env: { ...process.env, TZ: process.env.TZ || 'Asia/Seoul' } });
        }
      }
    } else {
      const { errors, notices, migrationChanges } = await integrationPrecheck(REPO_ROOT, base);
      console.log(`[integrate] ${base} 대비 바뀐 마이그레이션 ${migrationChanges.length}개`);
      for (const notice of notices) console.log(`⚠ ${notice}`);
      for (const error of errors) console.error(`❌ ${error}`);
      if (errors.length) process.exit(1);
      console.log('✅ Flyway 버전 충돌 없음');
    }
  } catch (error) {
    console.error(`❌ [integrate] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
