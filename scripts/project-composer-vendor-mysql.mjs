/**
 * MySQL·MariaDB 어댑터(설계서 §5·§6). 두 벤더의 차이는 정규식 엔진, 긴 키 처리, 시퀀스, JSON, 계산 컬럼이다.
 * 문자열 비교는 끝 공백까지 구분하는 이진 콜레이션으로 고정한다.
 */
import { columnsIn, gap } from './project-composer-vendor-model.mjs';
import { assertCoverage, createEmission, emitRows, escapeString, nextValues, renderExpression, violationExpression } from './project-composer-vendor-sql.mjs';

/** InnoDB 인덱스 키 상한과 utf8mb4 한 글자의 최대 바이트. */
const KEY_BYTES = 3072;
const CHAR_BYTES = 4;
const LONG_PREFIX = 768;
const COMPOSITE_PREFIX = 700;

const string = value => `'${escapeString(value).replaceAll('\\', '\\\\')}'`;
const SIGNAL = message => `SIGNAL SQLSTATE '23000' SET MESSAGE_TEXT = ${string(message)}`;

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
    case 'uuid': return maria ? 'UUID' : 'CHAR(36)';
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
    case 'uuid': return maria ? ' DEFAULT UUID()' : ' DEFAULT (UUID())';
    case 'now': return ` DEFAULT CURRENT_TIMESTAMP(${column.type.precision})`;
    case 'kst-date': return " DEFAULT (DATE_FORMAT(UTC_TIMESTAMP() + INTERVAL 9 HOUR, '%Y%m%d'))";
    case 'number': return ` DEFAULT ${value.value}`;
    case 'string': return ` DEFAULT ${string(value.value)}`;
    default: return gap(`MySQL 기본값 없음: ${value.kind}`);
  }
}

const columnBytes = (table, name) => {
  const { type } = table.columns.find(column => column.name === name);
  return type.kind === 'varchar' ? type.length * CHAR_BYTES : 8;
};

const syncTriggers = (table, trigger) => {
  const { legacy, current } = trigger;
  const same = (left, right) => `(${left} <=> ${right})`;
  const pair = `IF NOT ${same(`NEW.${current}`, `NEW.${legacy}`)} THEN ${SIGNAL('conflicting pair')}; END IF;`;
  return [
    [`${trigger.name}_i`, `CREATE TRIGGER ${trigger.name}_i BEFORE INSERT ON ${table.name} FOR EACH ROW BEGIN IF NEW.${legacy} IS NULL THEN SET NEW.${legacy} = NEW.${current}; END IF; IF NEW.${current} IS NULL THEN SET NEW.${current} = NEW.${legacy}; END IF; ${pair} END`],
    [`${trigger.name}_u`, `CREATE TRIGGER ${trigger.name}_u BEFORE UPDATE ON ${table.name} FOR EACH ROW BEGIN IF NOT ${same(`NEW.${legacy}`, `OLD.${legacy}`)} AND ${same(`NEW.${current}`, `OLD.${current}`)} THEN SET NEW.${current} = NEW.${legacy}; ELSEIF NOT ${same(`NEW.${current}`, `OLD.${current}`)} AND ${same(`NEW.${legacy}`, `OLD.${legacy}`)} THEN SET NEW.${legacy} = NEW.${current}; END IF; ${pair} END`],
  ];
};

function emitSchemaFor(vendor, model) {
  const maria = vendor === 'mariadb';
  const emission = createEmission(vendor);
  const dialect = dialectFor(maria);
  const newRow = dialectFor(maria, 'NEW.');
  for (const sequence of model.sequences) {
    if (maria) {
      emission.sql(`CREATE SEQUENCE ${sequence.name} START WITH 1 INCREMENT BY ${sequence.increment}`);
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
    }
    emission.sql(`CREATE TABLE ${table.name} (\n${lines.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}${table.comment ? ` COMMENT=${string(table.comment.slice(0, 2048))}` : ''}`);
  }
  for (const table of model.tables) {
    for (const unique of table.uniques) {
      const bytes = unique.columns.reduce((sum, name) => sum + columnBytes(table, name), 0);
      if (bytes <= KEY_BYTES || maria) {
        // MariaDB 는 긴 UNIQUE 를 엔진 내부 해시로 처리한다.
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns.join(', ')})`);
        emission.expect('constraints', table.name, unique.name);
        emission.cover(unique.name, 'unique');
      } else if (unique.columns.length === 1) {
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns[0]}(${LONG_PREFIX}))`);
        emission.expect('constraints', table.name, unique.name);
        emission.degrade(`${unique.name}:prefix`, `앞 ${LONG_PREFIX}자만 유일성을 본다. 저장값이 짧다는 전제다`);
        emission.cover(unique.name, 'prefix-unique');
      } else {
        const longest = unique.columns.reduce((a, b) => (columnBytes(table, a) >= columnBytes(table, b) ? a : b));
        const hash = `${longest}_hash`;
        emission.sql(`ALTER TABLE ${table.name} ADD COLUMN ${hash} BINARY(32) GENERATED ALWAYS AS (UNHEX(SHA2(${longest}, 256))) STORED`);
        emission.expect('columns', table.name, hash);
        emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns.map(name => (name === longest ? hash : name)).join(', ')})`);
        emission.expect('constraints', table.name, unique.name);
        emission.cover(unique.name, 'hash-unique');
      }
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
        emission.sql(`CREATE TRIGGER ${check.name}_i AFTER INSERT ON ${table.name} FOR EACH ROW BEGIN IF ${violation} THEN ${SIGNAL(check.name)}; END IF; END`, { raw: true });
        emission.sql(`CREATE TRIGGER ${check.name}_u BEFORE UPDATE ON ${table.name} FOR EACH ROW BEGIN IF ${violation} THEN ${SIGNAL(check.name)}; END IF; END`, { raw: true });
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
      if (index.where) emission.degrade(`${index.name}:partial`, '부분 인덱스가 없어 일반 인덱스로 둔다. 유일성이 없어 성능만 달라진다');
      if (index.columns.some(column => column.expression === 'trim')) {
        const [{ name }] = index.columns;
        const { length } = table.columns.find(column => column.name === name).type;
        if (maria) {
          emission.sql(`ALTER TABLE ${table.name} ADD COLUMN ${name}_trim VARCHAR(${length}) AS (TRIM(${name})) PERSISTENT`);
          emission.expect('columns', table.name, `${name}_trim`);
          emission.sql(`CREATE INDEX ${index.name} ON ${table.name} (${name}_trim)`);
        } else emission.sql(`CREATE INDEX ${index.name} ON ${table.name} ((CAST(TRIM(${name}) AS CHAR(${length}))))`);
      } else {
        const bytes = index.columns.reduce((sum, column) => sum + columnBytes(table, column.name), 0);
        const parts = index.columns.map(column => {
          const long = bytes > KEY_BYTES && columnBytes(table, column.name) > LONG_PREFIX * CHAR_BYTES / 2;
          const prefix = long ? `(${index.columns.length > 1 ? COMPOSITE_PREFIX : LONG_PREFIX})` : '';
          return `${column.name}${prefix}${column.descending ? ' DESC' : ''}`;
        });
        emission.sql(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${parts.join(', ')})`);
      }
      emission.expect('indexes', table.name, index.name);
      emission.cover(index.name, 'index');
    }
  }
  emission.sql(`CREATE TABLE tb_sys_ledger_permit (permit_key VARCHAR(50) PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${collation}`);
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_key');
  emission.expect('constraints', 'tb_sys_ledger_permit', 'PRIMARY');
  for (const table of model.tables) {
    for (const trigger of table.triggers) {
      if (trigger.kind === 'append-only') {
        emission.sql(`CREATE TRIGGER ${trigger.name}_u BEFORE UPDATE ON ${table.name} FOR EACH ROW BEGIN ${SIGNAL(`append-only ${table.name}`)}; END`, { raw: true });
        emission.sql(`CREATE TRIGGER ${trigger.name}_d BEFORE DELETE ON ${table.name} FOR EACH ROW BEGIN IF NOT EXISTS (SELECT 1 FROM tb_sys_ledger_permit WHERE permit_key = ${string(trigger.permit)}) THEN ${SIGNAL(`append-only ${table.name}`)}; END IF; END`, { raw: true });
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

function literalFor(column, value) {
  if (value === null) return 'NULL';
  const { kind } = column.type;
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
    literal: literalFor,
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
