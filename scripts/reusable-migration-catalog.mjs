/**
 * 재사용 생성물의 이관 표준 스키마 카탈로그(`db_columns.json`, 설계서 B12·12.5). 이관 도구의 MappingValidator 는 매핑 타깃이
 * 이 카탈로그에 있는지로 판정한다. 종전에는 생성물이 원본 카탈로그를 그대로 복사해, 구성에서 빠진 표로 가는 매핑도 검증을
 * 통과하고 적재 직전에야 실패했다. 생성기는 DB 번들이 검증한 스키마(`schema-contract.json` 의 snapshot — lock 의 스키마 해시와 같다)에서
 * 카탈로그를 다시 쓴다.
 *
 * 형식은 원본 스키마 검증(SchemaValidationIntegrationTest#render)과 같다 — 표 이름 순(코드 단위), 표 안에서는 컬럼 순번 순.
 * 번들 스키마는 Flyway 없이 만들어 `flyway_schema_history` 가 없으므로 그 표의 항목만 원본 카탈로그에서 가져온다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

/** 생성물 루트의 카탈로그를 DB 번들이 검증한 스키마로 다시 쓴다. 번들 스키마는 lock 의 스키마 해시와 같아야 한다. */
export function installProjectedColumnCatalog(root, output, dbBundle, dbLock) {
  const contract = JSON.parse(readFileSync(join(dbBundle, 'schema-contract.json'), 'utf8'));
  if (schemaSnapshotHash(contract.snapshot) !== dbLock.schemaSnapshotHash) {
    throw new Error('이관 카탈로그: DB 번들의 schema-contract.json 이 lock 의 스키마 해시와 다르다');
  }
  const text = projectedColumnCatalog(readFileSync(join(root, MIGRATION_CATALOG), 'utf8'), contract.snapshot);
  writeFileSync(join(output, MIGRATION_CATALOG), text, 'utf8');
  return { tables: parseColumnCatalog(text).size };
}
