/**
 * Oracle 어댑터(설계서 §5·§6). 기준은 19c 다. 23 계열에서만 되는 기능에 기대지 않는다.
 * 기본 설정(MAX_STRING_SIZE=STANDARD)에서 VARCHAR2 는 4,000바이트까지라 글자 수 1,000 을 넘는 컬럼은 CLOB 로 둔다.
 */
import { gap, keyColumns } from './project-composer-vendor-model.mjs';
import { assertCoverage, createEmission, emitRows, escapeString, nextValues, renderExpression } from './project-composer-vendor-sql.mjs';

const string = value => `'${escapeString(value)}'`;

/** 입력의 끝을 `$` 대신 `\z` 로 적는다. `$` 는 끝 줄바꿈 앞에도 맞는다. */
function oraclePattern(pattern) {
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) gap(`양끝을 고정하지 않은 정규식: ${pattern}`);
  return `${pattern.slice(0, -1)}\\z`;
}

const nullable = (table, name) => table.columns.find(column => column.name === name)?.nullable;

function compareEmpty(node, render, table) {
  if (node.operator === '=' && node.right.op === 'trim' && node.left.op === 'column' && node.right.arg.name === node.left.name) {
    // 공백뿐인 값의 TRIM 은 Oracle 에서 NULL 이라 등식이 UNKNOWN 이 되고, CHECK 는 UNKNOWN 을 통과시킨다. PostgreSQL 은 거부한다.
    const value = render(node.left), trimmed = render(node.right);
    const strict = `(${trimmed} IS NOT NULL AND ${value} = ${trimmed})`;
    return nullable(table, node.left.name) ? `(${value} IS NULL OR ${strict})` : strict;
  }
  if (node.right.op !== 'string' || node.right.value !== '') return null;
  if (node.operator !== '<>') gap(`${table.name}: Oracle 은 '' 와 같음을 표현할 수 없다`);
  const inner = render(node.left);
  // Oracle 의 '' 는 NULL 이다. `x <> ''` 를 그대로 두면 항상 UNKNOWN 이라 빈 값이 통과한다.
  const name = node.left.op === 'column' ? node.left.name : node.left.arg?.name;
  return name && nullable(table, name) ? `(${render({ op: 'column', name })} IS NULL OR ${inner} IS NOT NULL)` : `${inner} IS NOT NULL`;
}

const dialect = {
  column: name => name,
  string,
  charLength: inner => `LENGTH(${inner})`,
  compare: compareEmpty,
  regex(node, render) {
    const coalesced = node.arg.op === 'coalesce';
    if (coalesced && (node.arg.fallback !== '' || new RegExp(node.pattern).test(''))) gap(`이 COALESCE 정규식은 Oracle 로 옮길 수 없다: ${node.pattern}`);
    const target = render(coalesced ? node.arg.arg : node.arg);
    const match = `REGEXP_LIKE(${target}, ${string(oraclePattern(node.pattern))}, 'c')`;
    return coalesced ? `(${target} IS NOT NULL AND ${match})` : match;
  },
  addSeconds(inner, seconds) {
    if (seconds % 60) gap(`분 단위가 아닌 간격: ${seconds}`);
    return `(${inner} + INTERVAL '${seconds / 60}' MINUTE)`;
  },
  // 19c 의 CHECK 가 받는 JSON 판정은 IS JSON 이다. 객체 여부는 JSON_EXISTS 로 본다. 크기는 LOB 길이 함수를 CHECK 에 쓸 수 없어 저하다.
  jsonObject: column => `(${column} IS JSON AND JSON_EXISTS(${column}, '$?(@.type() == "object")'))`,
};

function physicalType(column, keys, table, emission) {
  const { type } = column;
  switch (type.kind) {
    case 'varchar':
      if (type.length <= 1000) return `VARCHAR2(${type.length} CHAR)`;
      if (keys.has(`${table.name}.${column.name}`)) {
        emission.degrade(`${table.name}.${column.name}:length`, 'LOB 는 키가 될 수 없어 4,000바이트 VARCHAR2 로 둔다');
        return 'VARCHAR2(4000 BYTE)';
      }
      return 'CLOB';
    case 'text': case 'json': return 'CLOB';
    case 'uuid': return 'RAW(16)';
    case 'binary': return 'BLOB';
    case 'timestamp': return `TIMESTAMP(${type.precision})`;
    case 'date': return 'DATE';
    case 'bigint': return 'NUMBER(19)';
    case 'integer': return 'NUMBER(10)';
    case 'numeric': return type.precision === null ? 'NUMBER' : `NUMBER(${type.precision},${type.scale ?? 0})`;
    default: return gap(`Oracle 타입 없음: ${type.kind}`);
  }
}

function defaultClause(column) {
  const value = column.default;
  if (!value) return '';
  switch (value.kind) {
    case 'sequence': return ` DEFAULT ${value.name}.NEXTVAL`;
    case 'uuid': return ' DEFAULT SYS_GUID()';
    case 'now': return ' DEFAULT LOCALTIMESTAMP';
    case 'kst-date': return " DEFAULT TO_CHAR(SYSTIMESTAMP AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD')";
    case 'number': return ` DEFAULT ${value.value}`;
    case 'string': return ` DEFAULT ${string(value.value)}`;
    default: return gap(`Oracle 기본값 없음: ${value.kind}`);
  }
}

const appendOnlyTrigger = (table, trigger) => `CREATE OR REPLACE TRIGGER ${trigger.name} BEFORE UPDATE OR DELETE ON ${table.name} FOR EACH ROW
DECLARE permits NUMBER;
BEGIN
  IF DELETING THEN
    SELECT COUNT(*) INTO permits FROM tb_sys_ledger_permit WHERE permit_key = ${string(trigger.permit)};
    IF permits > 0 THEN RETURN; END IF;
  END IF;
  RAISE_APPLICATION_ERROR(-20001, 'append-only ${table.name}');
END;`;

/** PL/SQL 조건은 삼값이라 NULL 과의 비교가 그대로 IF 를 빠져나간다. 언제나 참·거짓인 "다름" 식을 쓴다. */
const differs = (left, right) => `((${left} IS NULL AND ${right} IS NOT NULL) OR (${left} IS NOT NULL AND ${right} IS NULL) OR (${left} IS NOT NULL AND ${right} IS NOT NULL AND ${left} <> ${right}))`;

const syncPairTrigger = (table, trigger) => `CREATE OR REPLACE TRIGGER ${trigger.name} BEFORE INSERT OR UPDATE OF ${trigger.legacy}, ${trigger.current} ON ${table.name} FOR EACH ROW
DECLARE legacy_changed BOOLEAN; current_changed BOOLEAN;
BEGIN
  IF INSERTING THEN
    IF :NEW.${trigger.legacy} IS NULL THEN :NEW.${trigger.legacy} := :NEW.${trigger.current}; END IF;
    IF :NEW.${trigger.current} IS NULL THEN :NEW.${trigger.current} := :NEW.${trigger.legacy}; END IF;
  ELSE
    legacy_changed := ${differs(`:NEW.${trigger.legacy}`, `:OLD.${trigger.legacy}`)};
    current_changed := ${differs(`:NEW.${trigger.current}`, `:OLD.${trigger.current}`)};
    IF legacy_changed AND NOT current_changed THEN :NEW.${trigger.current} := :NEW.${trigger.legacy};
    ELSIF current_changed AND NOT legacy_changed THEN :NEW.${trigger.legacy} := :NEW.${trigger.current};
    END IF;
  END IF;
  IF ${differs(`:NEW.${trigger.current}`, `:NEW.${trigger.legacy}`)} THEN
    RAISE_APPLICATION_ERROR(-20002, 'conflicting pair');
  END IF;
END;`;

function emitSchema(model) {
  const emission = createEmission('oracle');
  const keys = keyColumns(model);
  for (const sequence of model.sequences) {
    emission.sql(`CREATE SEQUENCE ${sequence.name} START WITH 1 INCREMENT BY ${sequence.increment}`);
    emission.expect('sequences', '', sequence.name);
  }
  for (const table of model.tables) {
    const lines = table.columns.map(column => {
      emission.expect('columns', table.name, column.name);
      const identity = column.identity ? ' GENERATED BY DEFAULT AS IDENTITY' : '';
      return `  ${column.name} ${physicalType(column, keys, table, emission)}${identity}${defaultClause(column)}${!column.nullable && !column.identity ? ' NOT NULL' : ''}`;
    });
    if (table.primaryKey) {
      lines.push(`  CONSTRAINT ${table.primaryKey.name} PRIMARY KEY (${table.primaryKey.columns.join(', ')})`);
      emission.cover(table.primaryKey.name, 'primary-key');
      emission.expect('constraints', table.name, table.primaryKey.name);
    }
    emission.sql(`CREATE TABLE ${table.name} (\n${lines.join(',\n')}\n)`);
  }
  for (const table of model.tables) {
    for (const unique of table.uniques) {
      const columns = unique.columns.map(name => table.columns.find(column => column.name === name));
      if (unique.columns.length > 1 && columns.some(column => column.nullable)) {
        // 복합 UNIQUE 는 일부만 NULL 인 행도 중복으로 본다. PostgreSQL 은 허용하므로 모든 키가 찼을 때만 값을 내는 인덱스로 옮긴다.
        const whole = unique.columns.map(name => `${name} IS NOT NULL`).join(' AND ');
        emission.sql(`CREATE UNIQUE INDEX ${unique.name} ON ${table.name} (${unique.columns.map(name => `CASE WHEN ${whole} THEN ${name} END`).join(', ')})`);
        emission.expect('indexes', table.name, unique.name);
        emission.cover(unique.name, 'function-based-unique-index');
      } else {
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(', ')})`);
        emission.expect('constraints', table.name, unique.name);
        emission.cover(unique.name, 'unique');
      }
    }
  }
  for (const table of model.tables) {
    for (const key of table.foreignKeys) {
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${key.name} FOREIGN KEY (${key.columns.join(', ')}) REFERENCES ${key.parentTable} (${key.parentColumns.join(', ')})`
        + `${key.onDeleteCascade ? ' ON DELETE CASCADE' : ''}${key.deferrable ? ' DEFERRABLE INITIALLY DEFERRED' : ''}`);
      emission.expect('constraints', table.name, key.name);
      emission.cover(key.name, 'foreign-key');
    }
    for (const check of table.checks) {
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${check.name} CHECK (${renderExpression(check.expression, dialect, table)})`);
      emission.expect('constraints', table.name, check.name);
      emission.cover(check.name, 'check');
    }
    for (const index of table.indexes) {
      if (index.method === 'trigram') {
        emission.degrade(index.name, '부분 문자열 검색 인덱스가 없어 URL 부분 검색이 느려진다. 결과는 같다');
        continue;
      }
      if (index.where) emission.degrade(`${index.name}:partial`, '부분 인덱스가 없어 일반 인덱스로 둔다. 유일성이 없어 성능만 달라진다');
      const columns = index.columns.map(column => (column.expression === 'trim' ? `TRIM(${column.name})` : `${column.name}${column.descending ? ' DESC' : ''}`));
      emission.sql(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${columns.join(', ')})`);
      emission.expect('indexes', table.name, index.name);
      emission.cover(index.name, 'index');
    }
  }
  // 토큰이 키에 있어 중단된 바깥 트랜잭션의 미커밋 행을 안쪽 트랜잭션이 기다리지 않는다.
  emission.sql('CREATE TABLE tb_sys_ledger_permit (permit_key VARCHAR2(50 CHAR) NOT NULL, permit_token RAW(16) DEFAULT SYS_GUID() NOT NULL, PRIMARY KEY (permit_key, permit_token))');
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_key');
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_token');
  // 응용 잠금 슬롯. OracleSqlDialect.LOCK_SLOTS 와 같은 수의 행을 둔다. DBMS_LOCK 은 별도 권한이 필요하다.
  emission.sql('CREATE TABLE tb_sys_lock_slot (lock_slot_no NUMBER(10) PRIMARY KEY)');
  emission.expect('columns', 'tb_sys_lock_slot', 'lock_slot_no');
  emission.sql('INSERT INTO tb_sys_lock_slot (lock_slot_no) SELECT LEVEL - 1 FROM DUAL CONNECT BY LEVEL <= 65536');
  for (const table of model.tables) {
    for (const trigger of table.triggers) {
      emission.sql(trigger.kind === 'append-only' ? appendOnlyTrigger(table, trigger) : syncPairTrigger(table, trigger), { raw: true });
      emission.expect('triggers', table.name, trigger.name);
      emission.cover(trigger.name, trigger.kind);
    }
    if (table.comment) emission.sql(`COMMENT ON TABLE ${table.name} IS ${string(table.comment)}`);
    for (const column of table.columns) if (column.comment) emission.sql(`COMMENT ON COLUMN ${table.name}.${column.name} IS ${string(column.comment)}`);
  }
  emission.degradations.push({ name: 'empty-string', reason: "Oracle 은 '' 를 NULL 로 저장한다. NULL 허용 문자열의 빈 값은 null 로 돌아온다" });
  emission.degradations.push({ name: 'json-size', reason: 'JSON 크기 상한은 CHECK 로 강제하지 못한다' });
  return assertCoverage(model, emission);
}

const LONG_LITERAL = 3000;
/** 한 글자가 UTF-8 로 4바이트여도 리터럴 상한을 넘지 않는 조각 크기. */
const CLOB_CHUNK = 700;

/** SQL*Plus 와 Oracle 문자열 리터럴 상한을 넘지 않게 나눠 CLOB 로 잇는다. 코드 포인트로 잘라야 이모지가 깨지지 않는다. */
export function clobLiteral(value) {
  const characters = [...value];
  const parts = [];
  for (let index = 0; index < characters.length; index += CLOB_CHUNK) parts.push(`TO_CLOB(${string(characters.slice(index, index + CLOB_CHUNK).join(''))})`);
  return parts.join('\n|| ');
}

function literal(column, value) {
  if (value === null) return 'NULL';
  const { kind } = column.type;
  if (kind === 'bigint' || kind === 'integer' || kind === 'numeric') return String(value);
  if (kind === 'timestamp') return `TO_TIMESTAMP(${string(String(value).replace('T', ' ').slice(0, 26))}, 'YYYY-MM-DD HH24:MI:SS.FF')`;
  if (kind === 'date') return `DATE ${string(String(value).slice(0, 10))}`;
  if (kind === 'uuid') return `HEXTORAW(${string(String(value).replaceAll('-', ''))})`;
  if (kind === 'binary') return `TO_BLOB(HEXTORAW(${string(String(value).replace(/^\\x/, ''))}))`;
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return Buffer.byteLength(text) > LONG_LITERAL ? clobLiteral(text) : string(text);
}

export const oracleAdapter = {
  id: 'oracle', label: 'Oracle',
  identifier: name => name,
  literal, emitSchema,
  emitSeed: (model, rows) => emitRows(model, rows, oracleAdapter),
  emitSequenceSync(model, rows) {
    const { identities, sequences } = nextValues(model, rows);
    return [
      ...identities.map(item => `ALTER TABLE ${item.table} MODIFY ${item.column} GENERATED BY DEFAULT AS IDENTITY (START WITH ${item.next})`),
      ...sequences.map(item => `ALTER SEQUENCE ${item.name} RESTART START WITH ${item.next}`),
    ];
  },
};
