/**
 * MySQL·MariaDB 어댑터(설계서 §5·§6). 두 벤더의 차이는 정규식 엔진, 긴 키 처리, 시퀀스, JSON, 계산 컬럼이다.
 * 문자열 비교는 끝 공백까지 구분하는 이진 콜레이션으로 고정한다.
 */
import { columnsIn, gap } from './project-composer-vendor-model.mjs';
import { assertCoverage, createEmission, emitRows, escapeString, nextValues, renderExpression, violationExpression } from './project-composer-vendor-sql.mjs';

/** InnoDB 인덱스 키 상한(DYNAMIC 행 형식, 16KiB 페이지)과 utf8mb4 한 글자의 최대 바이트. 길이 접두·NULL 표시는 키 바이트에 들지 않는다(2026-11-04 실측). */
const KEY_BYTES = 3072;
const CHAR_BYTES = 4;
const LONG_PREFIX = 768;
const COMPOSITE_PREFIX = 700;
/** 긴 복합 유니크에 더하는 해시 생성 컬럼(BINARY(32))의 키 바이트. */
const HASH_BYTES = 32;

const string = value => `'${escapeString(value).replaceAll('\\', '\\\\')}'`;
/**
 * 트리거 거부의 SQLSTATE 는 PostgreSQL 원본의 분류를 따른다. 23000 을 쓰면 드라이버가 무결성 위반 예외로 올려 409 중복으로 읽힌다.
 * 원장 보호는 무결성 분류 밖(55000), CHECK 대체와 쌍 충돌은 원본 ERRCODE 와 같은 23514 다.
 */
const APPEND_ONLY_STATE = '55000';
const CHECK_STATE = '23514';
const SIGNAL = (state, message) => `SIGNAL SQLSTATE '${state}' SET MESSAGE_TEXT = ${string(message)}`;

/** DECIMAL 은 9자리마다 4바이트이고 남은 자리는 이 표대로다. 정수부와 소수부를 따로 센다(MySQL 저장 형식, DECIMAL(10,0)=5·(19,0)=9·(38,10)=18 실측). */
const DECIMAL_LEFTOVER_BYTES = [0, 1, 1, 2, 2, 3, 3, 4, 4, 4];
const decimalDigitsBytes = digits => Math.floor(digits / 9) * 4 + DECIMAL_LEFTOVER_BYTES[digits % 9];

/**
 * 키에 든 컬럼 하나의 바이트. 물리 타입(physicalType)으로 센다 — 문자열만 실제 크기로 세면 한계 직전의 정상 키(VARCHAR(767)+INT)를 멈춘다.
 * 값은 2026-11-04 MySQL 8.4·MariaDB 11.4 에서 VARBINARY 짝으로 잰 크기다. LONGTEXT·LONGBLOB 은 접두 없이 키가 될 수 없어 끝이 없다고 센다.
 */
export function keyColumnBytes(type, maria) {
  switch (type.kind) {
    case 'varchar': return type.length * CHAR_BYTES;
    case 'integer': return 4;
    case 'bigint': return 8;
    case 'date': return 3;
    // DATETIME 은 5바이트에 소수 초 두 자리마다 1바이트다(0:5, 3:7, 6:8).
    case 'timestamp': return 5 + Math.ceil(type.precision / 2);
    case 'numeric': {
      const [precision, scale] = type.precision === null ? [38, 10] : [type.precision, type.scale ?? 0];
      return decimalDigitsBytes(precision - scale) + decimalDigitsBytes(scale);
    }
    case 'uuid': return 16;
    case 'text': case 'json': case 'binary': return Infinity;
    default: return gap(`키 바이트를 모르는 타입: ${type.kind}`);
  }
}

const sum = values => values.reduce((total, value) => total + value, 0);

/**
 * 일반 인덱스의 컬럼별 접두. 키가 상한을 넘을 때 긴 문자열(1,536바이트 초과)만 자르고, 잘린 키 전체가 상한 안에 들도록 접두를 정한다.
 * 기본 접두는 단일 768자·복합 700자이고 남은 바이트가 모자라면 줄인다. 자를 컬럼이 없거나 잘라도 넘으면 null 이다 — 그대로 두면 적용 때 1071 로 멈춘다.
 */
export function indexPrefixes(sizes) {
  const total = sum(sizes);
  const long = sizes.map(size => total > KEY_BYTES && size > LONG_PREFIX * CHAR_BYTES / 2);
  if (total <= KEY_BYTES) return { long, prefixes: sizes.map(() => null) };
  const count = long.filter(Boolean).length;
  const budget = KEY_BYTES - sum(sizes.filter((_, at) => !long[at]));
  const prefix = Math.min(sizes.length > 1 ? COMPOSITE_PREFIX : LONG_PREFIX, Math.floor(budget / Math.max(count, 1) / CHAR_BYTES));
  if (!count || prefix < 1) return { long, prefixes: null };
  return { long, prefixes: long.map(item => (item ? prefix : null)) };
}

function endOfInput(pattern) {
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) gap(`양끝을 고정하지 않은 정규식: ${pattern}`);
  // `$` 는 끝 줄바꿈 앞에도 맞고 `\z` 는 NO_BACKSLASH_ESCAPES 에서 깨진다. 백슬래시 없는 표현을 쓴다.
  return `(?s)${pattern.slice(0, -1)}(?!.)`;
}

function dialectFor(maria, prefix = '') {
  return {
    column: name => `${prefix}${name}`,
    string,
    charLength: inner => `CHAR_LENGTH(${inner})`,
    regex: (node, render) => (maria ? `${render(node.arg)} REGEXP ${string(endOfInput(node.pattern))}` : `REGEXP_LIKE(${render(node.arg)}, ${string(endOfInput(node.pattern))}, 'c')`),
    addSeconds(inner, seconds) {
      if (seconds % 60) gap(`분 단위가 아닌 간격: ${seconds}`);
      return `(${inner} + INTERVAL ${seconds / 60} MINUTE)`;
    },
    jsonObject: (column, maxBytes) => (maria ? `(JSON_VALID(${column}) AND JSON_TYPE(${column}) = 'OBJECT' AND LENGTH(${column}) <= ${maxBytes})`
      : `(JSON_TYPE(${column}) = 'OBJECT' AND LENGTH(${column}) <= ${maxBytes})`),
    jsonViolation: () => gap('MySQL 계열은 JSON CHECK 를 위반식으로 옮기지 않는다'),
  };
}

function physicalType(column, maria) {
  const { type } = column;
  switch (type.kind) {
    case 'varchar': return `VARCHAR(${type.length})`;
    case 'text': return 'LONGTEXT';
    case 'json': return maria ? 'LONGTEXT' : 'JSON';
    // MySQL 은 UUID 타입이 없다. Hibernate 의 MySQL 기본 매핑(java.util.UUID → binary(16))에 맞춘다 — CHAR(36) 이면 스키마 검증이 멈춘다(설계서 §5 UUID 규칙).
    case 'uuid': return maria ? 'UUID' : 'BINARY(16)';
    case 'binary': return 'LONGBLOB';
    case 'timestamp': return `DATETIME(${type.precision})`;
    case 'date': return 'DATE';
    case 'bigint': return 'BIGINT';
    case 'integer': return 'INT';
    case 'numeric': return type.precision === null ? 'DECIMAL(38,10)' : `DECIMAL(${type.precision},${type.scale ?? 0})`;
    default: return gap(`MySQL 타입 없음: ${type.kind}`);
  }
}

function defaultClause(column, maria) {
  const value = column.default;
  if (!value) return '';
  switch (value.kind) {
    case 'sequence': return maria ? ` DEFAULT NEXTVAL(${value.name})` : '';
    case 'uuid': return maria ? ' DEFAULT UUID()' : ' DEFAULT (UUID_TO_BIN(UUID()))';
    case 'now': return ` DEFAULT CURRENT_TIMESTAMP(${column.type.precision})`;
    case 'kst-date': return " DEFAULT (DATE_FORMAT(UTC_TIMESTAMP() + INTERVAL 9 HOUR, '%Y%m%d'))";
    case 'number': return ` DEFAULT ${value.value}`;
    case 'string': return ` DEFAULT ${string(value.value)}`;
    default: return gap(`MySQL 기본값 없음: ${value.kind}`);
  }
}

const syncTriggers = (table, trigger) => {
  const { legacy, current } = trigger;
  const same = (left, right) => `(${left} <=> ${right})`;
  const pair = `IF NOT ${same(`NEW.${current}`, `NEW.${legacy}`)} THEN ${SIGNAL(CHECK_STATE, 'conflicting pair')}; END IF;`;
  return [
    [`${trigger.name}_i`, `CREATE TRIGGER ${trigger.name}_i BEFORE INSERT ON ${table.name} FOR EACH ROW BEGIN IF NEW.${legacy} IS NULL THEN SET NEW.${legacy} = NEW.${current}; END IF; IF NEW.${current} IS NULL THEN SET NEW.${current} = NEW.${legacy}; END IF; ${pair} END`],
    [`${trigger.name}_u`, `CREATE TRIGGER ${trigger.name}_u BEFORE UPDATE ON ${table.name} FOR EACH ROW BEGIN IF NOT ${same(`NEW.${legacy}`, `OLD.${legacy}`)} AND ${same(`NEW.${current}`, `OLD.${current}`)} THEN SET NEW.${current} = NEW.${legacy}; ELSEIF NOT ${same(`NEW.${current}`, `OLD.${current}`)} AND ${same(`NEW.${legacy}`, `OLD.${legacy}`)} THEN SET NEW.${legacy} = NEW.${current}; END IF; ${pair} END`],
  ];
};

/** 0~15 한 열 표. 넷을 곱하면 슬롯 65,536행이 한 문장에 나온다. */
const DIGITS = `(SELECT 0 AS n${Array.from({ length: 15 }, (_, at) => ` UNION ALL SELECT ${at + 1}`).join('')})`;

function emitSchemaFor(vendor, model) {
  const maria = vendor === 'mariadb';
  const emission = createEmission(vendor);
  const dialect = dialectFor(maria);
  const newRow = dialectFor(maria, 'NEW.');
  const bytesOf = (table, name) => keyColumnBytes(table.columns.find(column => column.name === name).type, maria);
  for (const sequence of model.sequences) {
    if (maria) {
      // 캐시를 두면 next_not_cached_value 가 캐시 끝으로 앞서 다음 값 대조가 실제 다음 값을 보지 못한다(2026-11-04 실측).
      emission.sql(`CREATE SEQUENCE ${sequence.name} START WITH 1 INCREMENT BY ${sequence.increment} NOCACHE`);
      emission.expect('sequences', '', sequence.name);
    } else {
      // MySQL 은 시퀀스가 없다. Hibernate 의 표 기반 시퀀스와 같은 모양으로 둔다.
      emission.sql(`CREATE TABLE ${sequence.name} (next_val BIGINT NOT NULL) ENGINE=InnoDB`);
      emission.sql(`INSERT INTO ${sequence.name} VALUES (${sequence.start})`);
      emission.expect('columns', sequence.name, 'next_val');
    }
  }
  const collation = maria ? 'utf8mb4_nopad_bin' : 'utf8mb4_0900_bin';
  for (const table of model.tables) {
    const lines = table.columns.map(column => {
      emission.expect('columns', table.name, column.name);
      const comment = column.comment ? ` COMMENT ${string(column.comment.slice(0, 1024))}` : '';
      return `  ${column.name} ${physicalType(column, maria)}${column.nullable ? '' : ' NOT NULL'}${column.identity ? ' AUTO_INCREMENT' : ''}${defaultClause(column, maria)}${comment}`;
    });
    if (table.primaryKey) {
      lines.push(`  CONSTRAINT ${table.primaryKey.name} PRIMARY KEY (${table.primaryKey.columns.join(', ')})`);
      emission.cover(table.primaryKey.name, 'primary-key');
      // 이 두 벤더의 기본 키 이름은 언제나 PRIMARY 다.
      emission.expect('constraints', table.name, 'PRIMARY');
      emission.expectUnique(table.name, 'PRIMARY', table.primaryKey.columns);
    }
    emission.sql(`CREATE TABLE ${table.name} (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}${table.comment ? ` COMMENT=${string(table.comment.slice(0, 2048))}` : ''}`);
  }
  for (const table of model.tables) {
    for (const unique of table.uniques) {
      const bytes = sum(unique.columns.map(name => bytesOf(table, name)));
      // 컬럼 조회는 대상 DB 에 실제로 든 키 컬럼을 낸다. 접두는 컬럼 이름만, 해시 유니크는 해시 컬럼이 나온다.
      let keyed = unique.columns;
      if (bytes <= KEY_BYTES || maria) {
        // MariaDB 는 긴 UNIQUE 를 엔진 내부 해시로 처리한다.
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(', ')})`);
        emission.cover(unique.name, 'unique');
      } else if (unique.columns.length === 1) {
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns[0]}(${LONG_PREFIX}))`);
        emission.degrade(`${unique.name}:prefix`, `앞 ${LONG_PREFIX}자만 유일성을 본다. 저장값이 짧다는 전제다`);
        emission.cover(unique.name, 'prefix-unique');
      } else {
        const longest = unique.columns.reduce((a, b) => (bytesOf(table, a) >= bytesOf(table, b) ? a : b));
        const hash = `${longest}_hash`;
        keyed = unique.columns.map(name => (name === longest ? hash : name));
        // 해시로 바꾼 뒤에도 넘으면 적용 때 1071 로 멈춘다. 다른 컬럼을 접두로 자르면 정상 값을 중복으로 거부하므로 번역을 멈춘다.
        if (HASH_BYTES + sum(unique.columns.filter(name => name !== longest).map(name => bytesOf(table, name))) > KEY_BYTES) {
          gap(`${unique.name}: 가장 긴 컬럼을 해시로 바꿔도 키가 ${KEY_BYTES}바이트를 넘는다`);
        }
        emission.sql(`ALTER TABLE ${table.name} ADD COLUMN ${hash} BINARY(32) GENERATED ALWAYS AS (UNHEX(SHA2(${longest}, 256))) STORED`);
        emission.expect('columns', table.name, hash);
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${keyed.join(', ')})`);
        emission.cover(unique.name, 'hash-unique');
      }
      emission.expect('constraints', table.name, unique.name);
      emission.expectUnique(table.name, unique.name, keyed);
    }
  }
  for (const table of model.tables) {
    const identity = new Set(table.columns.filter(column => column.identity).map(column => column.name));
    for (const key of table.foreignKeys) {
      if (key.deferrable) emission.degrade(`${key.name}:deferrable`, 'FK 를 지연 검사할 수 없다. 쓰는 순서를 원본에서 맞춘다');
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${key.name} FOREIGN KEY (${key.columns.join(', ')}) REFERENCES ${key.parentTable} (${key.parentColumns.join(', ')})${key.onDeleteCascade ? ' ON DELETE CASCADE' : ''}`);
      emission.expect('constraints', table.name, key.name);
      emission.cover(key.name, 'foreign-key');
    }
    for (const check of table.checks) {
      if ([...columnsIn(check.expression)].some(name => identity.has(name))) {
        // 자동 증가 컬럼은 CHECK 가 볼 수 없다. 입력 뒤에 값이 정해지므로 AFTER INSERT 로 판정한다.
        const violation = violationExpression(check.expression, newRow, table);
        emission.sql(`CREATE TRIGGER ${check.name}_i AFTER INSERT ON ${table.name} FOR EACH ROW BEGIN IF ${violation} THEN ${SIGNAL(CHECK_STATE, check.name)}; END IF; END`, { raw: true });
        emission.sql(`CREATE TRIGGER ${check.name}_u BEFORE UPDATE ON ${table.name} FOR EACH ROW BEGIN IF ${violation} THEN ${SIGNAL(CHECK_STATE, check.name)}; END IF; END`, { raw: true });
        emission.expect('triggers', table.name, `${check.name}_i`);
        emission.expect('triggers', table.name, `${check.name}_u`);
        emission.cover(check.name, 'trigger-check');
        continue;
      }
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${check.name} CHECK (${renderExpression(check.expression, dialect, table)})`);
      emission.expect('constraints', table.name, check.name);
      emission.cover(check.name, 'check');
    }
    for (const index of table.indexes) {
      if (index.method === 'trigram') {
        emission.degrade(index.name, '부분 문자열 검색 인덱스가 없어 URL 부분 검색이 느려진다. 결과는 같다');
        continue;
      }
      // 조건을 버린 UNIQUE 는 PostgreSQL 이 받는 행을 거부한다. 성능 저하가 아니라 뜻이 바뀌므로 저하로 두지 않는다.
      if (index.where && index.unique) gap(`${index.name}: 조건부 유일 인덱스는 조건 없이 옮길 수 없다`);
      if (index.where) emission.degrade(`${index.name}:partial`, '부분 인덱스가 없어 일반 인덱스로 둔다. 유일성이 없어 성능만 달라진다');
      if (index.columns.some(column => column.expression === 'trim')) {
        // 아래 두 번역은 유일하지 않은 인덱스다. 유일 식 인덱스를 그대로 옮기면 PostgreSQL 이 거부하는 중복을 받는다.
        if (index.unique) gap(`${index.name}: 식 유일 인덱스는 유일성을 지켜 옮기지 않는다`);
        const [{ name }] = index.columns;
        const { length } = table.columns.find(column => column.name === name).type;
        if (maria) {
          emission.sql(`ALTER TABLE ${table.name} ADD COLUMN ${name}_trim VARCHAR(${length}) AS (TRIM(${name})) PERSISTENT`);
          emission.expect('columns', table.name, `${name}_trim`);
          emission.sql(`CREATE INDEX ${index.name} ON ${table.name} (${name}_trim)`);
        } else emission.sql(`CREATE INDEX ${index.name} ON ${table.name} ((CAST(TRIM(${name}) AS CHAR(${length}))))`);
      } else {
        const { long, prefixes } = indexPrefixes(index.columns.map(column => bytesOf(table, column.name)));
        // 접두만 보는 유일 인덱스는 앞부분이 같고 뒤가 다른 정상 값을 중복으로 거부한다. 성능이 아니라 받는 행이 달라지므로 멈춘다.
        if (index.unique && long.some(Boolean)) gap(`${index.name}: 접두로 자른 유일 인덱스는 앞부분이 같은 다른 값을 거부한다`);
        // 잘라도 넘는 키는 MySQL 이 1071 로 거부하고 MariaDB 도 복합 일반 인덱스는 거부한다(2026-11-04 실측). 적용 때 멈추기 전에 여기서 멈춘다.
        if (!prefixes) gap(`${index.name}: 접두로 잘라도 키가 ${KEY_BYTES}바이트를 넘는다`);
        const parts = index.columns.map((column, at) => `${column.name}${prefixes[at] ? `(${prefixes[at]})` : ''}${column.descending ? ' DESC' : ''}`);
        emission.sql(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${parts.join(', ')})`);
      }
      if (index.unique) {
        // 이 두 벤더는 CREATE UNIQUE INDEX 도 제약 표에 UNIQUE 로 낸다(2026-11-04 실측). 메타 조회가 제약으로 읽으므로 기대도 제약에 둔다.
        emission.expect('constraints', table.name, index.name);
        emission.expectUnique(table.name, index.name, index.columns.map(column => column.name));
      } else emission.expect('indexes', table.name, index.name);
      emission.cover(index.name, 'index');
    }
  }
  // 허가 행은 연결 번호를 키에 넣는다. 트리거와 회수가 자기 키 전체로 찾아야 InnoDB 의 잠금 읽기가 다른 트랜잭션의 미커밋 허가를 기다리지 않는다
  // (2026-11-04 실측: 키만이거나 Oracle 처럼 토큰을 키에 넣으면 중첩 트랜잭션이 바깥의 미커밋 허가를 기다리다 1205 로 끝난다).
  // 기본값은 허가 키만 넣는 클라이언트(차등 시험의 원장 확인)를 같은 연결 번호로 채운다. 앱(InnoDbSqlDialect)은 CONNECTION_ID() 를 직접 넣는다.
  emission.sql(`CREATE TABLE tb_sys_ledger_permit (permit_key VARCHAR(50) NOT NULL, permit_conn BIGINT UNSIGNED NOT NULL DEFAULT (CONNECTION_ID()), PRIMARY KEY (permit_key, permit_conn)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_key');
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_conn');
  emission.expect('constraints', 'tb_sys_ledger_permit', 'PRIMARY');
  emission.expectUnique('tb_sys_ledger_permit', 'PRIMARY', ['permit_key', 'permit_conn']);
  // 응용 잠금 슬롯. InnoDbSqlDialect 가 키를 접는 슬롯 수와 같은 수의 행을 둔다. 재귀 CTE 는 기본 반복 상한(1,000)에서 멈춰 16행 표 넷의 곱으로 채운다(2026-11-04 실측).
  emission.sql(`CREATE TABLE tb_sys_lock_slot (lock_slot_no INT NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);
  emission.expect('columns', 'tb_sys_lock_slot', 'lock_slot_no');
  emission.expect('constraints', 'tb_sys_lock_slot', 'PRIMARY');
  emission.expectUnique('tb_sys_lock_slot', 'PRIMARY', ['lock_slot_no']);
  emission.sql(`INSERT INTO tb_sys_lock_slot (lock_slot_no) SELECT d0.n + 16 * d1.n + 256 * d2.n + 4096 * d3.n FROM ${DIGITS} d0 CROSS JOIN ${DIGITS} d1 CROSS JOIN ${DIGITS} d2 CROSS JOIN ${DIGITS} d3`);
  for (const table of model.tables) {
    for (const trigger of table.triggers) {
      if (trigger.kind === 'append-only') {
        emission.sql(`CREATE TRIGGER ${trigger.name}_u BEFORE UPDATE ON ${table.name} FOR EACH ROW BEGIN ${SIGNAL(APPEND_ONLY_STATE, `append-only ${table.name}`)}; END`, { raw: true });
        emission.sql(`CREATE TRIGGER ${trigger.name}_d BEFORE DELETE ON ${table.name} FOR EACH ROW BEGIN IF NOT EXISTS (SELECT 1 FROM tb_sys_ledger_permit WHERE permit_key = ${string(trigger.permit)} AND permit_conn = CONNECTION_ID())`
          + ` THEN ${SIGNAL(APPEND_ONLY_STATE, `append-only ${table.name}`)}; END IF; END`, { raw: true });
        emission.expect('triggers', table.name, `${trigger.name}_u`);
        emission.expect('triggers', table.name, `${trigger.name}_d`);
      } else {
        for (const [name, sql] of syncTriggers(table, trigger)) {
          emission.sql(sql, { raw: true });
          emission.expect('triggers', table.name, name);
        }
      }
      emission.cover(trigger.name, trigger.kind);
    }
  }
  return assertCoverage(model, emission);
}

function literalFor(column, value, maria) {
  if (value === null) return 'NULL';
  const { kind } = column.type;
  // Hibernate 의 binary(16) 과 같은 바이트 순서다(UUID_TO_BIN 의 두 번째 인자 없이).
  if (kind === 'uuid' && !maria) return `UUID_TO_BIN(${string(String(value))})`;
  if (kind === 'bigint' || kind === 'integer' || kind === 'numeric') return String(value);
  if (kind === 'timestamp') return string(String(value).replace('T', ' ').slice(0, 26));
  if (kind === 'date') return string(String(value).slice(0, 10));
  if (kind === 'binary') return `X'${String(value).replace(/^\\x/, '')}'`;
  return string(typeof value === 'object' ? JSON.stringify(value) : String(value));
}

function adapterFor(id, label) {
  const adapter = {
    id, label,
    identifier: name => name,
    literal: (column, value) => literalFor(column, value, id === 'mariadb'),
    emitSchema: model => emitSchemaFor(id, model),
    emitSeed: (model, rows) => emitRows(model, rows, adapter),
    emitSequenceSync(model, rows) {
      const { identities, sequences } = nextValues(model, rows);
      return [
        ...identities.map(item => `ALTER TABLE ${item.table} AUTO_INCREMENT = ${item.next}`),
        ...sequences.map(item => (id === 'mariadb' ? `ALTER SEQUENCE ${item.name} RESTART WITH ${item.next}` : `UPDATE ${item.name} SET next_val = ${item.next}`)),
      ];
    },
  };
  return adapter;
}

export const mysqlAdapter = adapterFor('mysql', 'MySQL');
export const mariadbAdapter = adapterFor('mariadb', 'MariaDB');
