/**
 * CUBRID 어댑터(설계서 §6, 제한 지원). 11.4 ko_KR.utf8 기준이다.
 * CHECK 를 엔진이 집행하지 않아 BEFORE 트리거로 옮기고, 트리거 조건은 NULL 이면 결과가 흔들리므로 위반식으로 쓴다.
 * 참조 무결성은 트리거로 판정하지 않는다. 경합에서 고아가 남기 때문이다(ADR-0047 결정 9).
 */
import { columnsIn, gap } from './project-composer-vendor-model.mjs';
import { assertCoverage, createEmission, emitRows, escapeString, nextValues, violationExpression } from './project-composer-vendor-sql.mjs';

const RESERVED = new Set(['role', 'data_type']);
const identifier = name => (RESERVED.has(name) ? `"${name}"` : name);
const string = value => `'${escapeString(value)}'`;

function physicalType(column) {
  const { type } = column;
  switch (type.kind) {
    case 'varchar': return `VARCHAR(${type.length})`;
    case 'text': case 'json': return 'STRING';
    case 'uuid': return 'CHAR(36)';
    case 'binary': return 'BLOB';
    case 'timestamp': return 'DATETIME';
    case 'date': return 'DATE';
    case 'bigint': return 'BIGINT';
    case 'integer': return 'INT';
    case 'numeric': return type.precision === null ? 'DECIMAL(38,10)' : `DECIMAL(${type.precision},${type.scale ?? 0})`;
    default: return gap(`CUBRID 타입 없음: ${type.kind}`);
  }
}

function defaultClause(column, emission, table) {
  const value = column.default;
  if (!value) return '';
  switch (value.kind) {
    case 'now': return ' DEFAULT SYS_DATETIME';
    case 'number': return ` DEFAULT ${value.value}`;
    case 'string': return ` DEFAULT ${string(value.value)}`;
    default:
      // DEFAULT 에 시퀀스·UUID·표현식을 쓸 수 없다. 값은 앱이 채운다.
      emission.degrade(`${table.name}.${column.name}:default`, 'DB 기본값이 없어 앱이 값을 채운다');
      return '';
  }
}

const dialectFor = prefix => ({
  column: name => `${prefix}${identifier(name)}`,
  string,
  charLength: inner => `CHAR_LENGTH(${inner})`,
  regex: (node, render) => `${render(node.arg)} REGEXP BINARY ${string(node.pattern)}`,
  addSeconds(inner, seconds) {
    if (seconds % 60) gap(`분 단위가 아닌 간격: ${seconds}`);
    return `DATE_ADD(${inner}, INTERVAL ${seconds / 60} MINUTE)`;
  },
  // JSON 타입과 UPDATE 트리거를 함께 쓰면 클라이언트가 종료된다. 첫 글자와 길이만 본다. 깨진 JSON 은 앱이 막는다.
  jsonViolation: (column, maxBytes) => `${column} IS NOT NULL AND (LEFT(LTRIM(${column}), 1) <> '{' OR LENGTH(${column}) > ${maxBytes})`,
});

const appendOnly = (emission, table, trigger) => {
  emission.sql(`CREATE TRIGGER ${trigger.name}_u BEFORE UPDATE ON ${table.name} EXECUTE REJECT`);
  emission.sql(`CREATE TRIGGER ${trigger.name}_d BEFORE DELETE ON ${table.name} IF ((SELECT COUNT(*) FROM tb_sys_ledger_permit WHERE permit_key = ${string(trigger.permit)}) = 0) EXECUTE REJECT`);
  emission.expect('triggers', table.name, `${trigger.name}_u`);
  emission.expect('triggers', table.name, `${trigger.name}_d`);
};

const syncPair = (emission, table, trigger) => {
  const [key] = table.primaryKey.columns;
  const { legacy, current } = trigger;
  emission.sql(`CREATE TRIGGER ${trigger.name}_c BEFORE INSERT ON ${table.name} IF (new.${legacy} IS NOT NULL AND new.${current} IS NOT NULL AND new.${legacy} <> new.${current}) EXECUTE REJECT`);
  emission.sql(`CREATE TRIGGER ${trigger.name}_a AFTER INSERT ON ${table.name} IF (obj.${current} IS NULL AND obj.${legacy} IS NOT NULL) EXECUTE UPDATE ${table.name} SET ${current} = obj.${legacy} WHERE ${key} = obj.${key}`);
  emission.sql(`CREATE TRIGGER ${trigger.name}_b AFTER INSERT ON ${table.name} IF (obj.${legacy} IS NULL AND obj.${current} IS NOT NULL) EXECUTE UPDATE ${table.name} SET ${legacy} = obj.${current} WHERE ${key} = obj.${key}`);
  for (const suffix of ['c', 'a', 'b']) emission.expect('triggers', table.name, `${trigger.name}_${suffix}`);
};

/** 복합 UNIQUE 의 일부 NULL 중복을 엔진이 거부한다. 모든 키가 찼을 때만 값을 갖는 그림자 키에 UNIQUE 를 건다. */
function shadowUnique(emission, table, unique, order) {
  const key = `uq_key_${order}`;
  const whole = unique.columns.map(name => `obj.${name} IS NOT NULL`).join(' AND ');
  // 길이를 앞에 붙여 구분자가 값에 들어 있어도 서로 다른 키가 같아지지 않게 한다.
  const value = unique.columns.map(name => `CAST(CHAR_LENGTH(CAST(obj.${name} AS VARCHAR(1100))) AS VARCHAR(10)) || ':' || CAST(obj.${name} AS VARCHAR(1100))`).join(" || ':' || ");
  const where = table.primaryKey.columns.map(name => `${name} = obj.${name}`).join(' AND ');
  emission.sql(`ALTER TABLE ${table.name} ADD COLUMN ${key} VARCHAR(2500)`);
  emission.sql(`CREATE UNIQUE INDEX ${unique.name} ON ${table.name} (${key})`);
  emission.sql(`CREATE TRIGGER ${unique.name}_ki AFTER INSERT ON ${table.name} IF (${whole}) EXECUTE UPDATE ${table.name} SET ${key} = ${value} WHERE ${where}`);
  emission.sql(`CREATE TRIGGER ${unique.name}_ku AFTER UPDATE ON ${table.name} IF (NVL(obj.${key}, CHR(30)) <> NVL(CASE WHEN ${whole} THEN ${value} END, CHR(30))) EXECUTE UPDATE ${table.name} SET ${key} = CASE WHEN ${whole} THEN ${value} END WHERE ${where}`);
  emission.expect('columns', table.name, key);
  emission.expect('indexes', table.name, unique.name);
  emission.expect('triggers', table.name, `${unique.name}_ki`);
  emission.expect('triggers', table.name, `${unique.name}_ku`);
  emission.cover(unique.name, 'shadow-unique');
}

/**
 * CUBRID 의 FK 는 부모 PK 만 참조한다. 부모의 PK 를 다른 FK 가 쓰지 않으면 UNIQUE 와 맞바꾸고,
 * 쓰고 있으면 키 전용 표를 두어 진짜 FK 가 그 PK 를 보게 한다.
 */
function planForeignKeyTargets(model) {
  const byName = new Map(model.tables.map(table => [table.name, table]));
  const swaps = new Map(), keyTables = new Map();
  const same = (left, right) => left.length === right.length && left.every((item, index) => item === right[index]);
  for (const table of model.tables) {
    for (const key of table.foreignKeys) {
      const parent = byName.get(key.parentTable);
      if (same(parent.primaryKey.columns, key.parentColumns)) continue;
      const unique = parent.uniques.find(item => same(item.columns, key.parentColumns));
      if (!unique) gap(`${key.name}: 부모 키가 UNIQUE 도 PK 도 아니다`);
      const primaryUsed = model.tables.some(other => other.foreignKeys.some(item => item.parentTable === parent.name && same(item.parentColumns, parent.primaryKey.columns)));
      if (!primaryUsed) swaps.set(parent.name, unique);
      else {
        if (key.parentColumns.length !== 1) gap(`${key.name}: 복합 키 전용 표는 문법 밖이다`);
        keyTables.set(parent.name, { table: parent, column: key.parentColumns[0], name: `${parent.name}_key` });
      }
    }
  }
  return { swaps, keyTables };
}

function emitSchema(model) {
  const emission = createEmission('cubrid');
  const { swaps, keyTables } = planForeignKeyTargets(model);
  for (const sequence of model.sequences) {
    emission.sql(`CREATE SERIAL ${sequence.name} START WITH 1 INCREMENT BY ${sequence.increment}`);
    emission.expect('sequences', '', sequence.name);
  }
  for (const table of model.tables) {
    const swapped = swaps.get(table.name);
    const primary = swapped ?? table.primaryKey;
    const lines = table.columns.map(column => {
      emission.expect('columns', table.name, column.name);
      const required = !column.nullable || (swapped && swapped.columns.includes(column.name));
      if (required && column.nullable) emission.degrade(`${table.name}.${column.name}:not-null`, 'FK 대상이라 PK 로 올리면서 NOT NULL 이 된다');
      return `  ${identifier(column.name)} ${physicalType(column)}${column.identity ? ' AUTO_INCREMENT' : ''}${defaultClause(column, emission, table)}${required ? ' NOT NULL' : ''}`;
    });
    if (primary) {
      lines.push(`  CONSTRAINT ${primary.name} PRIMARY KEY (${primary.columns.map(identifier).join(', ')})`);
      emission.cover(table.primaryKey.name, 'primary-key');
      emission.cover(primary.name, 'primary-key');
    }
    emission.sql(`CREATE TABLE ${table.name} (\n${lines.join(',\n')}\n)`);
    if (swapped) {
      const name = `uk_${table.primaryKey.name}`;
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${name} UNIQUE (${table.primaryKey.columns.map(identifier).join(', ')})`);
      emission.expect('indexes', table.name, name);
    }
    emission.expect('indexes', table.name, primary.name);
  }
  for (const { table, column, name } of keyTables.values()) {
    const { type } = table.columns.find(item => item.name === column);
    emission.sql(`CREATE TABLE ${name} (${column} VARCHAR(${type.length}) PRIMARY KEY)`);
    emission.expect('columns', name, column);
    emission.expect('indexes', name, `pk_${name}_${column}`);
    emission.sql(`CREATE TRIGGER ${name}_i AFTER INSERT ON ${table.name} EXECUTE INSERT INTO ${name} VALUES (obj.${column})`);
    emission.sql(`CREATE TRIGGER ${name}_d BEFORE DELETE ON ${table.name} EXECUTE DELETE FROM ${name} WHERE ${column} = obj.${column}`);
    emission.sql(`CREATE TRIGGER ${name}_u BEFORE UPDATE ON ${table.name} IF (new.${column} <> obj.${column}) EXECUTE UPDATE ${name} SET ${column} = new.${column} WHERE ${column} = obj.${column}`);
    for (const suffix of ['i', 'd', 'u']) emission.expect('triggers', table.name, `${name}_${suffix}`);
  }
  let shadow = 0;
  for (const table of model.tables) {
    for (const unique of table.uniques) {
      if (swaps.get(table.name) === unique) continue;
      const nullable = unique.columns.some(name => table.columns.find(column => column.name === name).nullable);
      if (unique.columns.length > 1 && nullable) {
        shadow += 1;
        shadowUnique(emission, table, unique, shadow);
        continue;
      }
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${unique.name} UNIQUE (${unique.columns.map(identifier).join(', ')})`);
      emission.expect('indexes', table.name, unique.name);
      emission.cover(unique.name, 'unique');
    }
  }
  const newRow = dialectFor('new.');
  for (const table of model.tables) {
    for (const key of table.foreignKeys) {
      if (key.deferrable) emission.degrade(`${key.name}:deferrable`, 'FK 를 지연 검사할 수 없다. 쓰는 순서를 원본에서 맞춘다');
      const target = keyTables.get(key.parentTable);
      const usesKeyTable = target && key.parentColumns[0] === target.column;
      emission.sql(`ALTER TABLE ${table.name} ADD CONSTRAINT ${key.name} FOREIGN KEY (${key.columns.map(identifier).join(', ')}) REFERENCES ${usesKeyTable ? target.name : key.parentTable} (${key.parentColumns.map(identifier).join(', ')})${key.onDeleteCascade ? ' ON DELETE CASCADE' : ''}`);
      emission.expect('indexes', table.name, key.name);
      emission.cover(key.name, usesKeyTable ? 'key-table-foreign-key' : 'foreign-key');
    }
    for (const check of table.checks) {
      if (columnsIn(check.expression).size === 0) gap(`${check.name}: 컬럼을 읽지 않는 CHECK`);
      const violation = violationExpression(check.expression, newRow, table);
      emission.sql(`CREATE TRIGGER ${check.name}_i BEFORE INSERT ON ${table.name} IF (${violation}) EXECUTE REJECT`);
      emission.sql(`CREATE TRIGGER ${check.name}_u BEFORE UPDATE ON ${table.name} IF (${violation}) EXECUTE REJECT`);
      emission.expect('triggers', table.name, `${check.name}_i`);
      emission.expect('triggers', table.name, `${check.name}_u`);
      emission.cover(check.name, 'trigger-check');
    }
    for (const index of table.indexes) {
      if (index.method === 'trigram') {
        emission.degrade(index.name, '부분 문자열 검색 인덱스가 없어 URL 부분 검색이 느려진다. 결과는 같다');
        continue;
      }
      if (index.where) emission.degrade(`${index.name}:partial`, '부분 인덱스 문법을 쓰지 않고 일반 인덱스로 둔다');
      const columns = index.columns.map(column => (column.expression === 'trim' ? `TRIM(${column.name})` : `${identifier(column.name)}${column.descending ? ' DESC' : ''}`));
      emission.sql(`CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.name} ON ${table.name} (${columns.join(', ')})`);
      emission.expect('indexes', table.name, index.name);
      emission.cover(index.name, 'index');
    }
  }
  emission.sql('CREATE TABLE tb_sys_ledger_permit (permit_key VARCHAR(50) PRIMARY KEY)');
  emission.expect('columns', 'tb_sys_ledger_permit', 'permit_key');
  emission.expect('indexes', 'tb_sys_ledger_permit', 'pk_tb_sys_ledger_permit_permit_key');
  for (const table of model.tables) {
    for (const trigger of table.triggers) {
      if (trigger.kind === 'append-only') appendOnly(emission, table, trigger);
      else syncPair(emission, table, trigger);
      emission.cover(trigger.name, trigger.kind);
    }
  }
  emission.degradations.push({ name: 'check-cost', reason: 'CHECK 를 트리거로 집행해 쓰기마다 평가한다' });
  emission.degradations.push({ name: 'json-validity', reason: 'JSON 형식을 DB 가 보장하지 못한다. 첫 글자와 길이만 본다' });
  emission.degradations.push({ name: 'timestamp-precision', reason: '시각이 밀리초까지다' });
  emission.degradations.push({ name: 'skip-locked', reason: 'SKIP LOCKED 가 없어 작업 선점은 상태 비교로 처리량이 줄어든다' });
  return assertCoverage(model, emission);
}

function literal(column, value) {
  if (value === null) return 'NULL';
  const { kind } = column.type;
  if (kind === 'bigint' || kind === 'integer' || kind === 'numeric') return String(value);
  if (kind === 'timestamp') return `DATETIME'${String(value).replace('T', ' ').slice(0, 23)}'`;
  if (kind === 'date') return `DATE'${String(value).slice(0, 10)}'`;
  if (kind === 'binary') return gap('CUBRID BLOB 시드는 지원하지 않는다');
  return string(typeof value === 'object' ? JSON.stringify(value) : String(value));
}

export const cubridAdapter = {
  id: 'cubrid', label: 'CUBRID',
  identifier, literal, emitSchema,
  emitSeed: (model, rows) => emitRows(model, rows, cubridAdapter),
  emitSequenceSync(model, rows) {
    const { identities, sequences } = nextValues(model, rows);
    return [
      ...identities.map(item => `ALTER TABLE ${item.table} AUTO_INCREMENT = ${item.next}`),
      ...sequences.map(item => `ALTER SERIAL ${item.name} START WITH ${item.next}`),
    ];
  },
};
