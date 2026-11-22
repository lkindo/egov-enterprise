/**
 * 재사용 생성물의 이관 표준 스키마 카탈로그(`db_columns.json`, 설계서 B12·12.5). 이관 도구의 MappingValidator 는 매핑 타깃이
 * 이 카탈로그에 있는지로 판정한다. 종전에는 생성물이 원본 카탈로그를 그대로 복사해, 구성에서 빠진 표로 가는 매핑도 검증을
 * 통과하고 적재 직전에야 실패했다. 생성기는 DB 번들이 검증한 스키마(`schema-contract.json` 의 snapshot — lock 의 스키마 해시와 같다)에서
 * 카탈로그를 다시 쓴다.
 *
 * 형식은 원본 스키마 검증(SchemaValidationIntegrationTest#render)과 같다 — 표 이름 순(코드 단위), 표 안에서는 컬럼 순번 순.
 * 번들 스키마는 Flyway 없이 만들어 `flyway_schema_history` 가 없으므로 그 표의 항목만 원본 카탈로그에서 가져온다.
 */
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schemaSnapshotHash } from './project-composer-db.mjs';

export const MIGRATION_CATALOG = 'db_columns.json';
const FLYWAY_HISTORY = 'flyway_schema_history';

const byCodeUnits = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

/** {table_name, column_name} 배열 텍스트를 표 → 컬럼 목록으로 읽는다. 형식이 틀리면 실패한다. */
export function parseColumnCatalog(text) {
  const entries = JSON.parse(text);
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('이관 카탈로그: 비어 있지 않은 배열이 아니다');
  const tables = new Map();
  for (const entry of entries) {
    if (typeof entry?.table_name !== 'string' || typeof entry?.column_name !== 'string') {
      throw new Error(`이관 카탈로그: 항목 형식이 아니다: ${JSON.stringify(entry)}`);
    }
    tables.set(entry.table_name, [...(tables.get(entry.table_name) ?? []), entry.column_name]);
  }
  return tables;
}

/** 표 → 컬럼 목록을 원본 스키마 검증과 같은 모양의 텍스트로 쓴다. */
export function renderColumnCatalog(tables) {
  const lines = [...tables.keys()].sort(byCodeUnits).flatMap(table => tables.get(table).map(column =>
    `  {\n    "table_name": "${table}",\n    "column_name": "${column}"\n  }`));
  return `[\n${lines.join(',\n')}\n]\n`;
}

/** 번들 스키마의 컬럼과 원본 카탈로그의 Flyway 이력 표로 생성물 카탈로그를 만든다. */
export function projectedColumnCatalog(originCatalogText, schema) {
  const origin = parseColumnCatalog(originCatalogText);
  const flyway = origin.get(FLYWAY_HISTORY);
  if (!flyway?.length) throw new Error(`이관 카탈로그: 원본 카탈로그에 ${FLYWAY_HISTORY} 가 없다`);
  if (!Array.isArray(schema?.columns) || schema.columns.length === 0) throw new Error('이관 카탈로그: 번들 스키마에 컬럼이 없다');
  const ordered = [...schema.columns].sort((left, right) =>
    byCodeUnits(left.table_name, right.table_name) || left.ordinal_position - right.ordinal_position);
  const tables = new Map([[FLYWAY_HISTORY, flyway]]);
  for (const column of ordered) {
    if (column.table_name === FLYWAY_HISTORY) throw new Error(`이관 카탈로그: 번들 스키마에 ${FLYWAY_HISTORY} 가 있다 — Flyway 이력 표는 원본에서 가져온다`);
    tables.set(column.table_name, [...(tables.get(column.table_name) ?? []), column.column_name]);
  }
  return renderColumnCatalog(tables);
}

function renderBundleColumnCatalog(root, dbBundle, dbLock) {
  const contract = JSON.parse(readFileSync(join(dbBundle, 'schema-contract.json'), 'utf8'));
  if (schemaSnapshotHash(contract.snapshot) !== dbLock.schemaSnapshotHash) {
    throw new Error('이관 카탈로그: DB 번들의 schema-contract.json 이 lock 의 스키마 해시와 다르다');
  }
  const text = projectedColumnCatalog(readFileSync(join(root, MIGRATION_CATALOG), 'utf8'), contract.snapshot);
  return { text, tables: parseColumnCatalog(text).size };
}

/** Validate a bundle's profile-lock.json and schema-contract.json before rendering its projected db_columns.json. */
export function readValidatedProjectedColumnCatalog({ sourceRoot, dbBundle }) {
  const lockPath = join(dbBundle, 'profile-lock.json');
  const dbLock = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (dbLock?.validated !== true) throw new Error('이관 카탈로그: 검증 완료(validated: true)된 DB 번들이 필요하다');
  return renderBundleColumnCatalog(sourceRoot, dbBundle, dbLock);
}

/** 생성물 루트의 카탈로그를 DB 번들이 검증한 스키마로 다시 쓴다. 번들 스키마는 lock 의 스키마 해시와 같아야 한다. */
export function installProjectedColumnCatalog(root, output, dbBundle, dbLock) {
  const { text, tables } = renderBundleColumnCatalog(root, dbBundle, dbLock);
  writeFileSync(join(output, MIGRATION_CATALOG), text, 'utf8');
  return { tables };
}

function canonicalOutputPath(targetPath) {
  const unresolved = [];
  let current = resolve(targetPath);
  for (;;) {
    try {
      const real = realpathSync.native ? realpathSync.native(current) : realpathSync(current);
      return unresolved.length ? join(real, ...unresolved.reverse()) : real;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      const parent = dirname(current);
      if (parent === current) return resolve(targetPath);
      unresolved.push(relative(parent, current));
      current = parent;
    }
  }
}

/** Export a target app's projected db_columns.json to an external path for standalone migration-tool CLI validation. */
export function exportProjectedColumnCatalog({ sourceRoot, dbBundle, outputFile }) {
  const resolvedSource = realpathSync.native ? realpathSync.native(resolve(sourceRoot)) : realpathSync(resolve(sourceRoot));
  const resolvedOutput = resolve(outputFile);
  const canonicalSourceCatalog = join(resolvedSource, MIGRATION_CATALOG);
  const canonicalOutput = canonicalOutputPath(resolvedOutput);
  const caseInsensitive = process.platform === 'win32' || process.platform === 'darwin';
  const sameFile = caseInsensitive
    ? canonicalOutput.toLowerCase() === canonicalSourceCatalog.toLowerCase()
    : canonicalOutput === canonicalSourceCatalog;
  if (sameFile) {
    throw new Error('이관 카탈로그: 원본 저장소의 db_columns.json 은 덮어쓸 수 없다');
  }
  for (let current = dirname(resolvedOutput); ; current = dirname(current)) {
    if (existsSync(join(current, 'reusable-base-lock.json'))) {
      throw new Error('생성 애플리케이션 프로젝트 안에는 db_columns.json 을 둘 수 없다(ADR-0062) — 앱 밖 경로에 출력하라');
    }
    const parent = dirname(current);
    if (parent === current) break;
  }
  const { text, tables } = readValidatedProjectedColumnCatalog({ sourceRoot: resolvedSource, dbBundle: resolve(dbBundle) });
  mkdirSync(dirname(resolvedOutput), { recursive: true });
  writeFileSync(resolvedOutput, text, 'utf8');
  return { outputFile: resolvedOutput, tables };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < argv.length; index += 2) {
      const flag = argv[index];
      const value = argv[index + 1];
      if (!['--db-bundle', '--output'].includes(flag) || !value || value.startsWith('--') || Object.hasOwn(options, flag)) {
        throw new Error('usage: reusable-migration-catalog.mjs --db-bundle <dir> --output <file>');
      }
      options[flag] = value;
    }
    if (!options['--db-bundle'] || !options['--output']) {
      throw new Error('usage: reusable-migration-catalog.mjs --db-bundle <dir> --output <file>');
    }
    const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const result = exportProjectedColumnCatalog({
      sourceRoot,
      dbBundle: options['--db-bundle'],
      outputFile: options['--output'],
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
