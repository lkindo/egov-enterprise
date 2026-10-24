/**
 * 산출물 초안 내보내기의 DB 모드 — 테이블·컬럼 정의서, 외래 키 목록, 기능별 물리 ERD, 표준 사전 표(DEC-OPS-382).
 *
 * 원천은 참조 스키마다: 이 작업이 새로 만든 일회용 PostgreSQL 17 컨테이너에 저장소 Flyway 를 DB 번들 생성기와 같은 순서로
 * 단계 적용한 결과(V2_99 까지 → 반복 시드 → 인가 Contract → 나머지 → 반복 시드, runAuthorizationMigrationStages). 단순
 * flyway migrate 는 인가 Contract 단계를 건너뛰므로 쓰지 않는다. 운영 DB 실측이 아니다(H1) — 공유 OCI 에 접속하지 않는다.
 * 적용 결과의 테이블 집합은 기능 선언(config/modules)의 소유 목록과 같아야 하고, 표준 사전 행 수는 core.json 의 원본 실측과
 * 같아야 한다 — 다르면 단계가 빠졌거나 선언이 낡은 것이라 멈춘다.
 *
 * 번들 lock 해시에 묶인 schemaSnapshotSql 은 건드리지 않고 산출물 전용 질의(deliverablesSchemaSql)를 쓴다.
 * 표지(설명 없음·용어 없음·폐기 용어·타입 대조·외래 키 없음)는 이름 대응으로 붙인 표시이지 표준 판정이 아니다 — 표준 판정은
 * DB/표준 소유자가 한다(GAP-STD-001). 논리 모델·엔터티·속성 정의서는 사람이 쓰고, 메타데이터 등록은 기관 몫이다.
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadComposerModules, moduleDatabaseInventory, sourceDatabaseSnapshot } from './composer-modules.mjs';
import { runComposerCommand } from './project-composer-command.mjs';
import { createOwnedPostgres, ownedContainerId, removeOwnedPostgres, removeOwnedPostgresByToken, waitForOwnedPostgres } from './project-composer-postgres.mjs';
import { buildIsolatedContractSql, readReviewedAuthorizationCatalogVersion, runAuthorizationMigrationStages, versionedMigrations } from './reusable-db-migrations.mjs';
import { TEMP_DB_PREFIX, assertIdentifier, createDatabase, dropTemporaryDatabase, inspectContainer, psql, restore } from './reusable-db-postgres.mjs';

const MIGRATION_DIR = 'api-server/src/main/resources/db/migration';
const REFERENCE_NOTICE = '참조 스키마다 — 저장소 Flyway 를 일회용 DB 에 단계 적용한 결과이며 운영 DB 실측이 아니다(H1).';
const FLAG_NOTICE = '표지는 이름 대응으로 붙인 표시다(컬럼 이름 대문자 = 표준 용어 영문 약어). 표준 적합 판정이 아니다 — 판정은 DB/표준 소유자가 한다(GAP-STD-001).';

/** 산출물 전용 스키마 질의 — 표·컬럼 설명, 키 구성 컬럼, 표준 사전. 순서를 고정해 같은 스키마면 같은 결과다. */
export function deliverablesSchemaSql() {
  return `SELECT json_build_object(
    'tables', COALESCE((SELECT json_agg(json_build_object('name',c.relname,'comment',obj_description(c.oid,'pg_class')) ORDER BY c.relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname<>'flyway_schema_history'),'[]'::json),
    'columns', COALESCE((SELECT json_agg(json_build_object('table',c.relname,'ordinal',a.attnum,'name',a.attname,
        'type',format_type(a.atttypid,a.atttypmod),'udt',t.typname,'length',information_schema._pg_char_max_length(a.atttypid,a.atttypmod),
        'precision',information_schema._pg_numeric_precision(a.atttypid,a.atttypmod),'scale',information_schema._pg_numeric_scale(a.atttypid,a.atttypmod),
        'nullable',NOT a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'comment',col_description(c.oid,a.attnum)) ORDER BY c.relname,a.attnum)
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_type t ON t.oid=a.atttypid
      LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname<>'flyway_schema_history' AND a.attnum>0 AND NOT a.attisdropped),'[]'::json),
    'constraints', COALESCE((SELECT json_agg(json_build_object('table',t.relname,'name',p.conname,'type',p.contype::text,
        'columns',(SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(p.conkey) WITH ORDINALITY k(attnum,ord)
          JOIN pg_attribute a ON a.attrelid=p.conrelid AND a.attnum=k.attnum),
        'referencedTable',r.relname,
        'referencedColumns',(SELECT json_agg(a.attname ORDER BY k.ord) FROM unnest(p.confkey) WITH ORDINALITY k(attnum,ord)
          JOIN pg_attribute a ON a.attrelid=p.confrelid AND a.attnum=k.attnum),
        'definition',pg_get_constraintdef(p.oid,true)) ORDER BY t.relname,p.conname)
      FROM pg_constraint p JOIN pg_class t ON t.oid=p.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
      LEFT JOIN pg_class r ON r.oid=p.confrelid WHERE n.nspname='public' AND p.contype IN ('p','f','u','c')),'[]'::json),
    'terms', COALESCE((SELECT json_agg(json_build_object('termName',term_name,'engAbbr',eng_abbr,'domainName',domain_name,
        'description',description,'synonyms',synonyms,'allowedValues',allowed_values,'deprecated',deprecated_yn) ORDER BY eng_abbr,term_name)
        FROM public.meta_standard_terms),'[]'::json),
    'words', COALESCE((SELECT json_agg(json_build_object('wordName',word_name,'engAbbr',eng_abbr,'description',word_dc,'representative',rprs_yn)
        ORDER BY eng_abbr,word_name) FROM public.meta_standard_words),'[]'::json),
    'domains', COALESCE((SELECT json_agg(json_build_object('group',domain_group,'name',domain_name,'type',data_type,'length',data_length)
        ORDER BY domain_name,domain_group) FROM public.meta_standard_domains),'[]'::json)
  )::text;`;
}

/** 표 → 소유 기능(공유 표는 여럿). files 는 config/modules 의 파일 내용이다. */
export function tableOwners(files) {
  const owners = new Map();
  for (const [name, value] of Object.entries(files)) {
    if (!value?.owns?.tables) continue;
    for (const table of value.owns.tables) owners.set(table, [...(owners.get(table) ?? []), value.id ?? name.replace(/\.json$/u, '')]);
  }
  for (const [table, ids] of owners) owners.set(table, [...new Set(ids)].sort());
  return owners;
}

const COLUMN_TYPES = new Map([['character varying', 'VARCHAR'], ['character', 'CHAR'], ['numeric', 'NUMERIC'], ['bigint', 'BIGINT'],
  ['integer', 'INTEGER'], ['smallint', 'SMALLINT'], ['timestamp without time zone', 'TIMESTAMP'], ['timestamp with time zone', 'TIMESTAMPTZ'],
  ['date', 'DATE'], ['text', 'TEXT'], ['boolean', 'BOOLEAN'], ['bytea', 'BYTEA'], ['jsonb', 'JSONB'], ['time without time zone', 'TIME']]);
const DOMAIN_TYPES = new Map([['DATETIME', 'TIMESTAMP'], ['INT', 'INTEGER']]);

/** 컬럼 형식의 기본 이름(길이·정밀도 표기 제외). */
export function baseType(type) {
  return COLUMN_TYPES.get(String(type).replace(/\(.*\)/u, '').trim()) ?? String(type).replace(/\(.*\)/u, '').trim().toUpperCase();
}

/** 컬럼과 표준 용어 도메인의 타입 대조 표지 — 이름이 같은지만 본다(판정 아님). */
export function typeContrast(column, domain) {
  if (!domain) return null;
  const expected = DOMAIN_TYPES.get(String(domain.type ?? '').toUpperCase()) ?? String(domain.type ?? '').toUpperCase();
  if (expected === '') return '도메인 타입 없음';
  const type = baseType(column.type);
  if (type !== expected) return '타입 다름';
  // 길이는 문자형의 글자 수와 NUMERIC 의 자릿수만 비교한다 — 정수·날짜형의 정밀도는 도메인 길이와 단위가 다르다.
  const length = ['VARCHAR', 'CHAR'].includes(type) ? column.length : type === 'NUMERIC' ? column.precision : null;
  if (domain.length !== null && domain.length !== undefined && length !== null && length !== undefined && Number(length) !== Number(domain.length)) return '길이 다름';
  return '같음';
}

export function dbSheets(snapshot, owners) {
  const terms = new Map(snapshot.terms.filter((term) => term.engAbbr).map((term) => [term.engAbbr, term]));
  const domains = new Map(snapshot.domains.map((domain) => [domain.name, domain]));
  const keys = new Map();
  for (const constraint of snapshot.constraints) {
    if (!['p', 'f'].includes(constraint.type)) continue;
    for (const column of constraint.columns ?? []) {
      const key = `${constraint.table}.${column}`;
      keys.set(key, [...new Set([...(keys.get(key) ?? []), constraint.type === 'p' ? 'PK' : 'FK'])]);
    }
  }
  const touched = new Set(snapshot.constraints.filter((row) => row.type === 'f').flatMap((row) => [row.table, row.referencedTable]));
  const columnsOf = new Map();
  for (const column of snapshot.columns) columnsOf.set(column.table, (columnsOf.get(column.table) ?? 0) + 1);
  const primary = new Map(snapshot.constraints.filter((row) => row.type === 'p').map((row) => [row.table, row.columns ?? []]));
  const sources = ['api-server/src/main/resources/db/migration/', 'config/modules/'];
  return [
    {
      id: 'db-tables', title: '테이블 정의서', sources,
      notices: [REFERENCE_NOTICE, '소유 기능은 기능 선언의 테이블 소유다. 외래 키 없음은 그 표를 가리키거나 그 표가 가리키는 물리 외래 키가 하나도 없다는 표시다.'],
      columns: [['name', '테이블'], ['comment', '설명'], ['owners', '소유 기능'], ['columns', '컬럼 수'], ['primaryKey', '기본 키'], ['flags', '표지']],
      rows: snapshot.tables.map((table) => ({ name: table.name, comment: table.comment, owners: owners.get(table.name) ?? [],
        columns: columnsOf.get(table.name) ?? 0, primaryKey: primary.get(table.name) ?? [],
        flags: [table.comment ? null : '설명 없음', touched.has(table.name) ? null : '외래 키 없음', primary.has(table.name) ? null : '기본 키 없음'].filter(Boolean) })),
    },
    {
      id: 'db-columns', title: '컬럼 정의서', sources,
      notices: [REFERENCE_NOTICE, FLAG_NOTICE, '타입 대조는 컬럼 형식과 용어 도메인의 타입 이름·길이가 같은지만 본다(DATETIME 은 TIMESTAMP 로 읽는다).'],
      columns: [['table', '테이블'], ['ordinal', '순서'], ['name', '컬럼'], ['comment', '설명'], ['type', '형식'], ['nullable', 'NULL 허용'],
        ['default', '기본값'], ['keys', '키'], ['term', '표준 용어'], ['domain', '용어 도메인'], ['domainType', '도메인 타입'], ['contrast', '타입 대조'], ['flags', '표지']],
      rows: snapshot.columns.map((column) => {
        const term = terms.get(column.name.toUpperCase());
        const domain = term?.domainName ? domains.get(term.domainName) : null;
        const contrast = typeContrast(column, domain);
        return { table: column.table, ordinal: column.ordinal, name: column.name, comment: column.comment, type: column.type, nullable: column.nullable,
          default: column.default, keys: keys.get(`${column.table}.${column.name}`) ?? [], term: term?.termName, domain: term?.domainName,
          domainType: domain ? `${domain.type ?? ''}${domain.length ? `(${domain.length})` : ''}` : null, contrast,
          flags: [column.comment ? null : '설명 없음', term ? null : '용어 없음', term?.deprecated === 'Y' ? '폐기 용어' : null,
            term && !domain ? '도메인 없음' : null, contrast && contrast !== '같음' ? contrast : null].filter(Boolean) };
      }),
    },
    {
      id: 'db-foreign-keys', title: '외래 키 목록', sources,
      notices: [REFERENCE_NOTICE, '물리 외래 키만 싣는다. 이름 규칙으로만 이어진 논리 참조는 싣지 않는다 — 논리 모델은 사람이 쓴다.'],
      columns: [['table', '테이블'], ['name', '제약'], ['columns', '컬럼'], ['referencedTable', '참조 테이블'], ['referencedColumns', '참조 컬럼'],
        ['definition', '정의'], ['owners', '소유 기능'], ['referencedOwners', '참조 소유 기능']],
      rows: snapshot.constraints.filter((row) => row.type === 'f').map((row) => ({ table: row.table, name: row.name, columns: row.columns ?? [],
        referencedTable: row.referencedTable, referencedColumns: row.referencedColumns ?? [], definition: row.definition,
        owners: owners.get(row.table) ?? [], referencedOwners: owners.get(row.referencedTable) ?? [] })),
    },
    {
      id: 'standard-terms', title: '표준 용어 사전', sources: ['api-server/src/main/resources/db/migration/'],
      notices: ['참조 스키마의 표준 사전 시드다. 기관 메타데이터 관리 시스템의 등록 상태가 아니다.'],
      columns: [['termName', '용어'], ['engAbbr', '영문 약어'], ['domainName', '도메인'], ['description', '설명'], ['synonyms', '동의어'],
        ['allowedValues', '허용값'], ['deprecated', '폐기']],
      rows: snapshot.terms,
    },
    {
      id: 'standard-words', title: '표준 단어 사전', sources: ['api-server/src/main/resources/db/migration/'],
      notices: ['참조 스키마의 표준 사전 시드다. 기관 메타데이터 관리 시스템의 등록 상태가 아니다.'],
      columns: [['wordName', '단어'], ['engAbbr', '영문 약어'], ['description', '설명'], ['representative', '대표']],
      rows: snapshot.words,
    },
    {
      id: 'standard-domains', title: '표준 도메인 사전', sources: ['api-server/src/main/resources/db/migration/'],
      notices: ['참조 스키마의 표준 사전 시드다. 기관 메타데이터 관리 시스템의 등록 상태가 아니다.'],
      columns: [['group', '도메인 그룹'], ['name', '도메인'], ['type', '타입'], ['length', '길이']],
      rows: snapshot.domains,
    },
  ];
}

const mermaidName = (value) => String(value).replace(/[^A-Za-z0-9_]/gu, '_');

/** 기능별 물리 ERD(Mermaid) — 기능이 소유한 표와 그 표가 잇는 다른 기능의 표. 속성은 키 컬럼만 그린다. */
export function erdMarkdown(snapshot, owners) {
  const features = [...new Set([...owners.values()].flat())].sort();
  const keyColumns = new Map();
  for (const constraint of snapshot.constraints.filter((row) => ['p', 'f'].includes(row.type))) {
    for (const column of constraint.columns ?? []) {
      const marks = keyColumns.get(constraint.table) ?? new Map();
      marks.set(column, [...new Set([...(marks.get(column) ?? []), constraint.type === 'p' ? 'PK' : 'FK'])].sort().reverse());
      keyColumns.set(constraint.table, marks);
    }
  }
  const udt = new Map(snapshot.columns.map((column) => [`${column.table}.${column.name}`, column.udt]));
  const foreignKeys = snapshot.constraints.filter((row) => row.type === 'f');
  const lines = ['# 기능별 물리 ERD', '', `> ${REFERENCE_NOTICE}`, '',
    '- 기능마다 그 기능이 소유한 표와, 외래 키로 이어진 다른 기능의 표를 그린다. 속성은 키 컬럼(PK·FK)만이다 — 전체 컬럼은 컬럼 정의서에 있다.',
    '- 관계선은 물리 외래 키다. 다중성은 추론하지 않고 부모 하나·자식 여럿으로 그린다. 논리 참조는 그리지 않는다.', ''];
  for (const feature of features) {
    const own = [...owners].filter(([, ids]) => ids.includes(feature)).map(([table]) => table).sort();
    const edges = foreignKeys.filter((row) => own.includes(row.table) || own.includes(row.referencedTable));
    const tables = [...new Set([...own, ...edges.flatMap((row) => [row.table, row.referencedTable])])].sort();
    lines.push(`## ${feature}`, '', `소유 표 ${own.length}개, 외래 키 ${edges.length}개.`, '', '```mermaid', 'erDiagram');
    for (const table of tables) {
      const marks = [...(keyColumns.get(table) ?? new Map())].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
      lines.push(`  ${mermaidName(table)} {`);
      for (const [column, kinds] of marks) lines.push(`    ${mermaidName(udt.get(`${table}.${column}`) ?? 'unknown')} ${mermaidName(column)} ${kinds.join(', ')}`);
      lines.push('  }');
    }
    for (const row of edges) lines.push(`  ${mermaidName(row.referencedTable)} ||--o{ ${mermaidName(row.table)} : "${row.name}"`);
    lines.push('```', '');
  }
  return `${lines.join('\n')}`;
}

/** 적용 결과가 선언·원본 실측과 같은지 — 다르면 단계가 빠졌거나 선언이 낡았다. */
export function assertReferenceSchema(snapshot, { expectedTables, metaRows }) {
  const actual = snapshot.tables.map((table) => table.name).sort();
  const expected = [...expectedTables].sort();
  const missing = expected.filter((table) => !actual.includes(table));
  const extra = actual.filter((table) => !expected.includes(table));
  if (missing.length || extra.length) {
    throw new Error(`reference schema tables differ from config/modules ownership (missing: ${missing.join(', ') || '-'}; extra: ${extra.join(', ') || '-'})`);
  }
  const counts = { meta_standard_terms: snapshot.terms.length, meta_standard_words: snapshot.words.length, meta_standard_domains: snapshot.domains.length };
  for (const [table, count] of Object.entries(counts)) {
    if (metaRows[table] !== undefined && metaRows[table] !== count) {
      throw new Error(`reference schema ${table} has ${count} rows, config/modules/core.json databaseSnapshot says ${metaRows[table]}`);
    }
  }
}

/**
 * 일회용 컨테이너를 만들고 참조 스키마를 적용해 읽은 뒤 지운다. 컨테이너는 포트를 공개하지 않고 소유 표식을 확인한 뒤 지운다
 * (project-composer-postgres.mjs). 돌려주는 값: { snapshot, server, migrations }.
 */
export async function readReferenceSchema({ root, run = runComposerCommand }) {
  const token = randomBytes(8).toString('hex');
  const docker = (args, options = {}) => run('docker', args, { root, capture: true, ...options });
  let container;
  try {
    container = await createOwnedPostgres(docker, { name: `egov-deliverables-db-${token}`, token });
    if (!ownedContainerId(container)) throw new Error('Invalid owned database container identity');
    if (!await waitForOwnedPostgres(docker, container)) throw new Error('Owned PostgreSQL did not become ready');
    const { user } = inspectContainer(container);
    const database = assertIdentifier(`${TEMP_DB_PREFIX}deliverables_${token}`, 'deliverables DB');
    createDatabase(container, user, database);
    try {
      const migrations = versionedMigrations();
      const reviewedSeed = migrations.find((migration) => migration.name === 'V2_99__seed_explicit_operation_grants.sql');
      const catalogVersion = readReviewedAuthorizationCatalogVersion(reviewedSeed?.sql.toString('utf8') ?? '');
      const contractSql = readFileSync(join(root, 'api-server/src/main/resources/db/cutover/authorization-contract.sql'), 'utf8');
      runAuthorizationMigrationStages(migrations, {
        migrate: (migration) => restore(container, user, database, `BEGIN;\n${migration.sql.toString('utf8')}\nCOMMIT;`),
        repeatables: () => {
          for (const seed of ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql']) restore(container, user, database, readFileSync(join(root, MIGRATION_DIR, seed)));
        },
        contract: () => restore(container, user, database, buildIsolatedContractSql(database, catalogVersion, contractSql)),
      });
      const snapshot = JSON.parse(psql(container, user, database, deliverablesSchemaSql()));
      const server = psql(container, user, database, 'SHOW server_version');
      // 적용한 SQL 전부(버전 파일·반복 시드·인가 Contract)의 다이제스트 — 줄 끝은 LF 로 맞춘다.
      const text = (value) => value.toString('utf8').replace(/\r\n?/gu, '\n');
      const applied = [...migrations.map((migration) => [migration.name, text(migration.sql)]),
        ...['R__seed_framework.sql', 'R__zz_seed_base_admin.sql'].map((seed) => [seed, text(readFileSync(join(root, MIGRATION_DIR, seed)))]),
        ['authorization-contract.sql', text(contractSql)]];
      const inputDigest = createHash('sha256').update(applied.map(([name, sql]) => `${name}\t${createHash('sha256').update(sql).digest('hex')}\n`).join('')).digest('hex');
      return { snapshot, server, migrations: migrations.map((migration) => migration.name), inputDigest };
    } finally {
      dropTemporaryDatabase(container, user, database);
    }
  } finally {
    if (ownedContainerId(container)) await removeOwnedPostgres(docker, container, token);
    else await removeOwnedPostgresByToken(docker, token);
  }
}

/** DB 모드의 표·ERD 와 manifest 에 실을 값. */
export async function loadDatabaseDeliverables(root) {
  const modules = loadComposerModules(root);
  const owners = tableOwners(modules.files);
  const { snapshot, server, migrations, inputDigest } = await readReferenceSchema({ root });
  assertReferenceSchema(snapshot, { expectedTables: moduleDatabaseInventory(modules.files).tables, metaRows: sourceDatabaseSnapshot(modules.files).metaRows });
  return { sheets: dbSheets(snapshot, owners), erd: { path: 'db-erd.md', title: '기능별 물리 ERD', text: erdMarkdown(snapshot, owners) },
    database: { mode: 'disposable-staged-flyway', postgres: server, migrations: migrations.length },
    input: { path: `(Flyway 마이그레이션 ${migrations.length}개·반복 시드·인가 Contract)`, sha256: inputDigest } };
}
