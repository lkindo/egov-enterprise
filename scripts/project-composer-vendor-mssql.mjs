/**
 * SQL Server 어댑터(설계서 §5·§6). 기준은 2022 다.
 * 정규식이 없어 CHECK 의 패턴은 검토한 목록으로만 옮긴다. 목록에 없는 패턴은 번역을 멈춘다.
 * LEN 은 뒤 공백을 세지 않으므로 길이 판정은 DATALENGTH 로 한다.
 */
import { gap, keyColumns } from './project-composer-vendor-model.mjs';
import { assertCoverage, createEmission, emitRows, escapeString, nextValues, renderExpression } from './project-composer-vendor-sql.mjs';

const COLLATION = 'Korean_100_BIN2';
const LENGTH_COLLATION = 'Korean_100_CI_AS_SC';
/** 비클러스터 인덱스 키 상한(바이트)과 클러스터 키 상한. */
const INDEX_KEY_BYTES = 1700;
const CLUSTERED_KEY_BYTES = 900;

const string = value => `N'${escapeString(value)}'`;
const digitsOnly = target => `${target} NOT LIKE N'%[^0-9]%'`;
const units = target => `DATALENGTH(${target})`;

/** 패턴별 번역. 대상 컬럼은 이진 콜레이션이라 범위 문자가 코드 값으로 판정된다. */
const LIKE_PATTERNS = Object.freeze({
  '^[0-9a-f]{64}$': target => `(${units(target)} = 128 AND ${target} NOT LIKE N'%[^0-9a-f]%')`,
  '^[1-9][0-9]{0,18}$': target => `(${units(target)} BETWEEN 2 AND 38 AND ${digitsOnly(target)} AND ${target} NOT LIKE N'0%')`,
  '^[0-9]{8}$': target => `(${units(target)} = 16 AND ${digitsOnly(target)})`,
  '^[0-9]{1,11}$': target => `(${units(target)} BETWEEN 2 AND 22 AND ${digitsOnly(target)})`,
  '^[a-z0-9]+(-[a-z0-9]+)*$': target => `(${units(target)} > 0 AND ${target} NOT LIKE N'%[^a-z0-9-]%' AND ${target} NOT LIKE N'-%' AND ${target} NOT LIKE N'%-' AND ${target} NOT LIKE N'%--%')`,
  '^([01][0-9]|2[0-3])[0-5][0-9][0-5][0-9]$': target => `(${units(target)} = 12 AND (${target} LIKE N'[01][0-9][0-5][0-9][0-5][0-9]' OR ${target} LIKE N'2[0-3][0-5][0-9][0-5][0-9]'))`,
});

const dialect = {
  column: name => name,
  string,
  charLength: inner => `(LEN((${inner} + N'.') COLLATE ${LENGTH_COLLATION}) - 1)`,
  compare(node, render) {
    // SQL Server 의 = 는 뒤 공백을 무시한다. 빈 값 판정과 값·TRIM 값 비교는 바이트 길이로 옮긴다.
    if (node.right.op === 'string' && node.right.value === '' && node.operator === '<>') return `${units(render(node.left))} > 0`;
    if (node.operator === '=' && node.right.op === 'trim' && node.left.op === 'column' && node.right.arg.name === node.left.name) {
      return `${units(render(node.left))} = ${units(render(node.right))}`;
    }
    return null;
  },
  regex(node, render) {
    const translate = LIKE_PATTERNS[node.pattern];
    if (!translate) gap(`SQL Server 로 옮길 수 없는 정규식: ${node.pattern}`);
    if (node.arg.op === 'coalesce' && (node.arg.fallback !== '' || new RegExp(node.pattern).test(''))) gap(`이 COALESCE 정규식은 옮길 수 없다: ${node.pattern}`);
    return translate(render(node.arg));
  },
  addSeconds(inner, seconds) {
    if (seconds % 60) gap(`분 단위가 아닌 간격: ${seconds}`);
    return `DATEADD(minute, ${seconds / 60}, ${inner})`;
  },
  jsonObject: (column, maxBytes) => `(ISJSON(${column}, OBJECT) = 1 AND DATALENGTH(${column}) <= ${maxBytes * 2})`,
};

function physicalType(column, keys, table) {
  const { type } = column;
  switch (type.kind) {
    case 'varchar': {
      // 키가 아닌 컬럼은 2배로 잡는다. 이모지는 UTF-16 두 칸이라 NVARCHAR(n) 은 저장 범위가 줄어든다.
      if (keys.has(`${table.name}.${column.name}`)) return `NVARCHAR(${type.length}) COLLATE ${COLLATION}`;
      return `${type.length > 2000 ? 'NVARCHAR(MAX)' : `NVARCHAR(${type.length * 2})`} COLLATE ${COLLATION}`;
    }
    case 'text': case 'json': return `NVARCHAR(MAX) COLLATE ${COLLATION}`;
    case 'uuid': return 'UNIQUEIDENTIFIER';
    case 'binary': return 'VARBINARY(MAX)';
    case 'timestamp': return `DATETIME2(${type.precision})`;
    case 'date': return 'DATE';
    case 'bigint': return 'BIGINT';
    case 'integer': return 'INT';
    case 'numeric': return type.precision === null ? 'DECIMAL(38,10)' : `DECIMAL(${type.precision},${type.scale ?? 0})`;
    default: return gap(`SQL Server 타입 없음: ${type.kind}`);
  }
}

function defaultClause(column) {
  const value = column.default;
  if (!value) return '';
  switch (value.kind) {
    case 'sequence': return ` DEFAULT NEXT VALUE FOR ${value.name}`;
    case 'uuid': return ' DEFAULT NEWID()';
    case 'now': return ' DEFAULT SYSDATETIME()';
    case 'kst-date': return " DEFAULT CONVERT(NVARCHAR(8), SYSDATETIMEOFFSET() AT TIME ZONE 'Korea Standard Time', 112)";
    case 'number': return ` DEFAULT ${value.value}`;
    case 'string': return ` DEFAULT ${string(value.value)}`;
    default: return gap(`SQL Server 기본값 없음: ${value.kind}`);
  }
}

const columnBytes = (table, name) => {
  const { type } = table.columns.find(column => column.name === name);
  return type.kind === 'varchar' ? type.length * 2 : 8;
};

const appendOnlyTrigger = (table, trigger) => `CREATE TRIGGER ${trigger.name} ON ${table.name} AFTER UPDATE, DELETE AS BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM deleted) RETURN;
  IF EXISTS (SELECT 1 FROM inserted) OR NOT EXISTS (SELECT 1 FROM tb_sys_ledger_permit WITH (READCOMMITTED) WHERE permit_key = ${string(trigger.permit)})
    THROW 51000, 'append-only ${table.name}', 1;
END`;

function syncPairTrigger(table, trigger) {
  const [key] = table.primaryKey.columns;
  const { legacy, current } = trigger;
  return `CREATE TRIGGER ${trigger.name} ON ${table.name} AFTER INSERT, UPDATE AS BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1 FROM inserted) RETURN;
  IF NOT (UPDATE(${legacy}) OR UPDATE(${current})) RETURN;
  UPDATE t SET
    ${legacy} = CASE WHEN d.${key} IS NULL THEN COALESCE(i.${legacy}, i.${current}) WHEN i.${current} IS DISTINCT FROM d.${current} AND i.${legacy} IS NOT DISTINCT FROM d.${legacy} THEN i.${current} ELSE i.${legacy} END,
    ${current} = CASE WHEN d.${key} IS NULL THEN COALESCE(i.${current}, i.${legacy}) WHEN i.${legacy} IS DISTINCT FROM d.${legacy} AND i.${current} IS NOT DISTINCT FROM d.${current} THEN i.${legacy} ELSE i.${current} END
  FROM ${table.name} t JOIN inserted i ON t.${key} = i.${key} LEFT JOIN deleted d ON d.${key} = i.${key};
  IF EXISTS (SELECT 1 FROM ${table.name} t JOIN inserted i ON t.${key} = i.${key} WHERE t.${legacy} IS DISTINCT FROM t.${current}) THROW 51001, 'conflicting pair', 1;
END`;
}

function emitUnique(emission, table, unique, foreignKeyTargets) {
  const bytes = unique.columns.reduce((sum, name) => sum + columnBytes(table, name), 0);
  const nullable = unique.columns.filter(name => table.columns.find(column => column.name === name).nullable);
  const longest = unique.columns.reduce((a, b) => (columnBytes(table, a) >= columnBytes(table, b) ? a : b));
  const referenced = foreignKeyTargets.has(`${table.name}:${unique.columns.join(',')}`);
  if (nullable.length && referenced) {
    // 필터 유일 인덱스는 FK 대상이 못 된다. NULL 은 한 행만 들어갈 수 있다.
    emission.degrade(`${unique.name}:null`, 'FK 대상이라 UNIQUE 를 유지한다. NULL 은 한 행만 허용된다');
  } else if (nullable.length) {
    const where = ` WHERE ${unique.columns.map(name => `${name} IS NOT NULL`).join(' AND ')}`;
    if (bytes > INDEX_KEY_BYTES && unique.columns.length > 1) {
      const hash = `${longest}_hash`;
      emission.sql(`ALTER TABLE ${table.name} ADD ${hash} AS CAST(HASHBYTES('SHA2_256', ${longest}) AS BINARY(32)) PERSISTED`);
      emission.expect('columns', table.name, hash);
      emission.sql(`CREATE UNIQUE INDEX ${unique.name} ON ${table.name} (${unique.columns.map(name => (name === longest ? hash : name)).join(', ')})${where}`);
    } else emission.sql(`CREATE UNIQUE INDEX ${unique.name} ON ${table.name} (${unique.columns.join(', ')})${where}`);
    emission.expect('indexes', table.name, unique.name);
    emission.cover(unique.name, 'filtered-unique-index');
    return;
  }
  if (bytes > INDEX_KEY_BYTES) emission.degrade(`${unique.name}:length`, `${INDEX_KEY_BYTES}바이트를 넘는 값은 저장이 거부된다. 저장값이 짧다는 전제다`);
  emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(', ')})`);
  emission.expect('constraints', table.name, unique.name);
  emission.cover(unique.name, 'unique');
}

function emitIndex(emission, table, index) {
  if (index.method === 'trigram') {
    emission.degrade(index.name, '부분 문자열 검색 인덱스가 없어 URL 부분 검색이 느려진다. 결과는 같다');
    return;
  }
  if (index.columns.some(column => column.expression === 'trim')) {
    const [{ name }] = index.columns;
    emission.sql(`ALTER TABLE ${table.name} ADD ${name}_trim AS TRIM(${name}) PERSISTED`);
    emission.expect('columns', table.name, `${name}_trim`);
    emission.sql(`CREATE INDEX ${index.name} ON ${table.name} (${name}_trim)`);
    emission.expect('indexes', table.name, index.name);
    emission.cover(index.name, 'computed-column-index');
    return;
  }
  const bytes = index.columns.reduce((sum, column) => sum + columnBytes(table, column.name), 0);
  const render = column => `${column.name}${column.descending ? ' DESC' : ''}`;
  if (bytes > INDEX_KEY_BYTES && index.columns.length === 1) {
    emission.degrade(index.name, `${INDEX_KEY_BYTES}바이트를 넘는 값의 INSERT 가 실패하므로 인덱스를 뺀다. 표가 작아 성능 영향이 적다`);
    return;
  }
  const where = index.where ? ` WHERE ${renderExpression(index.where, dialect, table)}` : '';
  if (bytes > INDEX_KEY_BYTES) {
    const included = index.columns.filter(column => columnBytes(table, column.name) * 2 > INDEX_KEY_BYTES);
    const keyed = index.columns.filter(column => !included.includes(column));
    emission.sql(`CREATE INDEX ${index.name} ON ${table.name} (${keyed.map(render).join(', ')}) INCLUDE (${included.map(column => column.name).join(', ')})${where}`);
  } else emission.sql(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${index.columns.map(render).join(', ')})${where}`);
  emission.expect('indexes', table.name, index.name);
  emission.cover(index.name, 'index');
}

function emitSchema(model) {
  const emission = createEmission('mssql');
  const keys = keyColumns(model);
  const foreignKeyTargets = new Set(model.tables.flatMap(table => table.foreignKeys.map(key => `${key.parentTable}:${key.parentColumns.join(',')}`)));
  for (const sequence of model.sequences) {
    emission.sql(`CREATE SEQUENCE ${sequence.name} AS BIGINT START WITH 1 INCREMENT BY ${sequence.increment}`);
    emission.expect('sequences', '', sequence.name);
  }
  for (const table of model.tables) {
    const lines = table.columns.map(column => {
      emission.expect('columns', table.name, column.name);
      return `  ${column.name} ${physicalType(column, keys, table)}${column.identity ? ' IDENTITY(1,1)' : ''}${defaultClause(column)}${column.nullable ? '' : ' NOT NULL'}`;
    });
    if (table.primaryKey) {
      const bytes = table.primaryKey.columns.reduce((sum, name) => sum + columnBytes(table, name), 0);
      lines.push(`  CONSTRAINT ${table.primaryKey.name} PRIMARY KEY${bytes > CLUSTERED_KEY_BYTES ? ' NONCLUSTERED' : ''} (${table.primaryKey.columns.join(', ')})`);
      emission.cover(table.primaryKey.name, 'primary-key');
      emission.expect('constraints', table.name, table.primaryKey.name);
    }
    emission.sql(`CREATE TABLE ${table.name} (\n${lines.join(',\n')}\n)`);
  }
  for (const table of model.tables) for (const unique of table.uniques) emitUnique(emission, table, unique, foreignKeyTargets);
  for (const table of model.tables) {
    for (const key of table.foreignKeys) {
      if (key.deferrable) emission.degrade(`${key.name}:deferrable`, 'FK 를 지연 검사할 수 없다. 쓰는 순서를 원본에서 맞춘다');
      // 자기 참조와 여러 경로의 CASCADE 는 서버가 거부한다. 지금 스키마에는 그런 FK 가 없고, 생기면 적용 대조에서 드러난다.
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${key.name} FOREIGN KEY (${key.columns.join(', ')}) REFERENCES ${key.parentTable} (${key.parentColumns.join(', ')})${key.onDeleteCascade ? ' ON DELETE CASCADE' : ''}`);
      emission.expect('constraints', table.name, key.name);
      emission.cover(key.name, 'foreign-key');
    }
    for (const check of table.checks) {
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${check.name} CHECK (${renderExpression(check.expression, dialect, table)})`);
      emission.expect('constraints', table.name, check.name);
      emission.cover(check.name, 'check');
    }
    for (const index of table.indexes) emitIndex(emission, table, index);
  }
  emission.sql(`CREATE TABLE tb_sys_ledger_permit (permit_key NVARCHAR(50) COLLATE ${COLLATION} NOT NULL PRIMARY KEY)`);
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_key');
  for (const table of model.tables) {
    for (const trigger of table.triggers) {
      emission.sql(trigger.kind === 'append-only' ? appendOnlyTrigger(table, trigger) : syncPairTrigger(table, trigger), { raw: true });
      emission.expect('triggers', table.name, trigger.name);
      emission.cover(trigger.name, trigger.kind);
    }
  }
  emission.degradations.push({ name: 'trailing-space', reason: '= 와 UNIQUE 가 뒤 공백을 무시한다. 키 값은 앱에서 잘라 저장한다' });
  return assertCoverage(model, emission);
}

function literal(column, value) {
  if (value === null) return 'NULL';
  const { kind } = column.type;
  if (kind === 'bigint' || kind === 'integer' || kind === 'numeric') return String(value);
  if (kind === 'timestamp') return `'${String(value).replace('T', ' ').slice(0, 26)}'`;
  if (kind === 'date') return `'${String(value).slice(0, 10)}'`;
  if (kind === 'uuid') return `'${value}'`;
  if (kind === 'binary') return `0x${String(value).replace(/^\\x/, '')}`;
  return string(typeof value === 'object' ? JSON.stringify(value) : String(value));
}

export const mssqlAdapter = {
  id: 'mssql', label: 'SQL Server',
  identifier: name => name,
  literal, emitSchema,
  emitSeed: (model, rows) => emitRows(model, rows, mssqlAdapter),
  identityInsert: table => (table.columns.some(column => column.identity)
    ? { before: `SET IDENTITY_INSERT ${table.name} ON`, after: `SET IDENTITY_INSERT ${table.name} OFF` } : null),
  emitSequenceSync(model, rows) {
    const { identities, sequences } = nextValues(model, rows);
    return [
      ...identities.filter(item => item.next > 1).map(item => `DBCC CHECKIDENT ('${item.table}', RESEED, ${item.next - 1}) WITH NO_INFOMSGS`),
      ...sequences.map(item => `ALTER SEQUENCE ${item.name} RESTART WITH ${item.next}`),
    ];
  },
};
