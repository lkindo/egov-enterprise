/**
 * 벤더 어댑터가 함께 쓰는 번역 도구(설계서 D-4·D-8).
 *
 * 어댑터는 모델의 모든 키·제약·인덱스·트리거를 "번역했다" 또는 "저하로 선언했다" 둘 중 하나로 남겨야 한다.
 * 선언 없이 빠진 항목은 assertCoverage 가 잡는다.
 */
import { columnsIn, containsOp, gap, tablesInDependencyOrder } from './project-composer-vendor-model.mjs';

export function createEmission(vendor) {
  const coverage = new Map();
  const emission = {
    vendor, statements: [], degradations: [],
    expected: { columns: [], constraints: [], indexes: [], triggers: [], sequences: [] },
    sql(sql, options = {}) { emission.statements.push({ sql, raw: Boolean(options.raw) }); },
    expect(kind, table, name) { emission.expected[kind].push(`${table}.${name}`); },
    /** 모델의 한 항목을 어떻게 옮겼는지 남긴다. */
    cover(name, how) { coverage.set(name, how); },
    degrade(name, reason) { coverage.set(name, 'degraded'); emission.degradations.push({ name, reason }); },
    coverage,
  };
  return emission;
}

const modelItems = model => model.tables.flatMap(table => [
  ...(table.primaryKey ? [table.primaryKey.name] : []),
  ...[...table.uniques, ...table.foreignKeys, ...table.checks, ...table.indexes, ...table.triggers].map(item => item.name),
]);

/** 선언 없는 축소를 막는다. 번역이 조용히 건너뛴 항목이 있으면 벤더 프로젝트에서 사라진 줄 모른다. */
export function assertCoverage(model, emission) {
  const missing = modelItems(model).filter(name => !emission.coverage.has(name));
  if (missing.length) gap(`${emission.vendor}: 번역도 저하 선언도 없는 항목 ${missing.join(', ')}`);
  return emission;
}

const FLIP = { '=': '<>', '<>': '=', '>=': '<', '<=': '>', '>': '<=', '<': '>=' };

/** jsonb_typeof(c)='object' AND octet_length(c)<=n 묶음은 벤더마다 한 덩어리로 옮겨야 한다. */
function jsonObjectRule(node) {
  if (node.op !== 'and' || node.args.length !== 2) return null;
  const [type, size] = node.args;
  if (type.op !== 'compare' || type.left.op !== 'jsonType' || type.operator !== '=' || type.right.value !== 'object') return null;
  if (size.op !== 'compare' || size.left.op !== 'octetLength' || size.operator !== '<=' || size.right.op !== 'number') return null;
  if (type.left.arg.name !== size.left.arg.name) return null;
  return { column: type.left.arg.name, maxBytes: size.right.value };
}

/** PostgreSQL CHECK 는 식이 NULL 이면 통과한다. 앞쪽이 NULL 일 수 있는 논리값 등식은 의미를 지키지 못해 멈춘다. */
export function expandIff(node, table) {
  const nullable = [...columnsIn(node.left)].filter(name => table.columns.find(column => column.name === name)?.nullable);
  if (nullable.length || node.left.op !== 'compare') gap(`${table.name}: 논리값 등식의 왼쪽은 NOT NULL 비교여야 한다`);
  const negate = item => {
    if (item.op === 'compare') return { ...item, operator: FLIP[item.operator] };
    if (item.op === 'isNull') return { ...item, op: 'isNotNull' };
    if (item.op === 'isNotNull') return { ...item, op: 'isNull' };
    return gap(`${table.name}: 이 논리값 등식은 전개할 수 없다`);
  };
  return { op: 'or', args: [{ op: 'and', args: [node.left, node.right] }, { op: 'and', args: [negate(node.left), negate(node.right)] }] };
}

export function renderExpression(node, dialect, table) {
  const render = item => renderExpression(item, dialect, table);
  switch (node.op) {
    case 'or': return `(${node.args.map(render).join(' OR ')})`;
    case 'and': {
      const json = jsonObjectRule(node);
      if (json) return dialect.jsonObject(dialect.column(json.column), json.maxBytes);
      return `(${node.args.map(render).join(' AND ')})`;
    }
    case 'iff': return render(expandIff(node, table));
    case 'compare': return dialect.compare?.(node, render, table) ?? `${render(node.left)} ${node.operator} ${render(node.right)}`;
    case 'isNull': return `${render(node.arg)} IS NULL`;
    case 'isNotNull': return `${render(node.arg)} IS NOT NULL`;
    case 'in': return `${render(node.arg)} IN (${node.values.map(dialect.string).join(', ')})`;
    case 'regex': return dialect.regex(node, render, table);
    case 'column': return dialect.column(node.name);
    case 'string': return dialect.string(node.value);
    case 'number': return String(node.value);
    case 'charLength': return dialect.charLength(render(node.arg));
    case 'trim': return `TRIM(${render(node.arg)})`;
    case 'coalesce': return `COALESCE(${render(node.arg)}, ${dialect.string(node.fallback)})`;
    case 'addSeconds': return dialect.addSeconds(render(node.arg), node.seconds);
    default: return gap(`${table.name}: 번역할 수 없는 식 ${node.op}`);
  }
}

const guard = (node, dialect) => [...columnsIn(node)].map(name => `${dialect.column(name)} IS NOT NULL`);

/**
 * CHECK 가 실패할 때만 참인 조건. CHECK 는 식이 FALSE 일 때만 실패하지만 트리거 조건은 NULL 을 다르게 다룬다.
 * 그래서 모든 잎에 NULL 가드를 붙여 결과가 NULL 이 되지 않게 한다. NULL 을 값으로 바꾸는 식은 가드가 틀려지므로 멈춘다.
 */
export function violationExpression(node, dialect, table) {
  const again = item => violationExpression(item, dialect, table);
  const render = item => renderExpression(item, dialect, table);
  switch (node.op) {
    case 'or': return node.args.map(item => `(${again(item)})`).join(' AND ');
    case 'and': {
      const json = jsonObjectRule(node);
      if (json) return dialect.jsonViolation(dialect.column(json.column), json.maxBytes);
      return node.args.map(item => `(${again(item)})`).join(' OR ');
    }
    case 'iff': return again(expandIff(node, table));
    case 'isNull': return `${render(node.arg)} IS NOT NULL`;
    case 'isNotNull': return `${render(node.arg)} IS NULL`;
    case 'in':
      if (containsOp(node, 'coalesce')) gap(`${table.name}: NULL 을 값으로 바꾸는 목록 비교는 위반식으로 옮길 수 없다`);
      return [...guard(node, dialect), `${render(node.arg)} NOT IN (${node.values.map(dialect.string).join(', ')})`].join(' AND ');
    case 'regex':
      if (node.arg.op === 'coalesce') return `NOT (${render(node)})`;
      if (containsOp(node.arg, 'coalesce')) gap(`${table.name}: 중첩된 COALESCE 는 위반식으로 옮길 수 없다`);
      return [...guard(node, dialect), `NOT (${render(node)})`].join(' AND ');
    case 'compare':
      if (containsOp(node, 'coalesce')) gap(`${table.name}: NULL 을 값으로 바꾸는 비교는 위반식으로 옮길 수 없다`);
      return [...guard(node, dialect), `${render(node.left)} ${FLIP[node.operator]} ${render(node.right)}`].join(' AND ');
    default: return gap(`${table.name}: 위반식으로 옮길 수 없는 식 ${node.op}`);
  }
}

/** 표에서 행을 읽는 문장. 재현성을 위해 기본 키 순서로 읽는다. */
export function vendorRowsSql(model) {
  const parts = model.tables.map(table => {
    const order = table.primaryKey ? ` ORDER BY ${table.primaryKey.columns.map(name => `t."${name}"`).join(',')}` : '';
    return `'${table.name}', COALESCE((SELECT json_agg(to_jsonb(t)${order}) FROM public."${table.name}" t),'[]'::json)`;
  });
  const chunks = [];
  for (let index = 0; index < parts.length; index += 40) chunks.push(`json_build_object(${parts.slice(index, index + 40).join(',')})::jsonb`);
  return `SELECT (${chunks.join(' || ')})::text;`;
}

/** 자기 참조 FK 는 부모 행을 먼저 넣는다. */
function parentFirst(table, rows) {
  const self = table.foreignKeys.find(key => key.parentTable === table.name);
  if (!self || self.columns.length !== 1) return rows;
  const [child] = self.columns, [parent] = self.parentColumns;
  const byKey = new Map(rows.map(row => [row[parent], row]));
  const done = new Set(), sorted = [];
  const add = (row, path = new Set()) => {
    if (done.has(row)) return;
    if (path.has(row)) gap(`${table.name}: 자기 참조 행에 순환이 있다`);
    path.add(row);
    const up = byKey.get(row[child]);
    if (up) add(up, path);
    done.add(row);
    sorted.push(row);
  };
  rows.forEach(row => add(row));
  return sorted;
}

/** 재적용을 통과한 PostgreSQL 의 행을 벤더 INSERT 로 옮긴다(설계서 D-5). */
export function emitRows(model, rows, adapter) {
  const statements = [];
  for (const table of tablesInDependencyOrder(model, candidate => (rows[candidate.name] ?? []).length > 0)) {
    const items = rows[table.name];
    const list = table.columns.map(column => adapter.identifier(column.name)).join(', ');
    const wrap = adapter.identityInsert?.(table) ?? null;
    if (wrap) statements.push(wrap.before);
    for (const row of parentFirst(table, items)) {
      for (const name of Object.keys(row)) if (!table.columns.some(column => column.name === name)) gap(`${table.name}: 모델에 없는 시드 컬럼 ${name}`);
      for (const column of table.columns) {
        if (['bigint', 'integer', 'numeric'].includes(column.type.kind) && (row[column.name] ?? null) !== null) exactNumber(row[column.name], `${table.name}.${column.name}`);
      }
      statements.push(`INSERT INTO ${table.name} (${list}) VALUES (${table.columns.map(column => adapter.literal(column, row[column.name] ?? null)).join(', ')})`);
    }
    if (wrap) statements.push(wrap.after);
  }
  return statements;
}

export const escapeString = value => String(value).replaceAll("'", "''");

/** 십진 15자리까지는 배정밀도 왕복이 값을 보존한다. 앞의 0 은 자릿수가 아니다. */
const significantDigits = value => String(Math.abs(value)).replace(/e[-+]?\d+$/, '').replace('.', '').replace(/^0+/, '').length;

/** JSON 으로 읽은 숫자는 2^53 이나 15자리를 넘으면 값이 바뀔 수 있다. 조용히 틀린 값을 넣지 않고 멈춘다. */
export function exactNumber(value, label) {
  const exact = typeof value === 'number' && (Number.isInteger(value) ? Number.isSafeInteger(value) : Number.isFinite(value) && significantDigits(value) <= 15);
  if (!exact) gap(`정확히 옮길 수 없는 숫자: ${label}`);
  return value;
}

/** 다음 값의 시작점. 표의 최댓값과 PostgreSQL 시퀀스의 마지막 값 가운데 큰 값 뒤다(설계서 D-5). */
export function nextValues(model, rows) {
  const identities = model.tables.flatMap(table => table.columns.filter(column => column.identity).map(column => {
    const values = (rows[table.name] ?? []).map(row => exactNumber(row[column.name], `${table.name}.${column.name}`));
    return { table: table.name, column: column.name, next: values.length ? exactNumber(Math.max(...values) + 1, table.name) : 1 };
  }));
  const sequences = model.sequences.map(sequence => {
    const last = sequence.last === null ? 0 : exactNumber(Number(sequence.last), sequence.name);
    const owners = model.tables.flatMap(table => table.columns.filter(column => column.default?.kind === 'sequence' && column.default.name === sequence.name)
      .flatMap(column => (rows[table.name] ?? []).map(row => exactNumber(row[column.name], `${table.name}.${column.name}`))));
    return { name: sequence.name, next: exactNumber(Math.max(sequence.start, last + sequence.increment, ...owners.map(value => value + sequence.increment)), sequence.name), increment: sequence.increment };
  });
  return { identities, sequences };
}

/** 대상 DB 메타를 다시 읽은 결과와 어댑터가 낸 기대치를 대조한다. 이름은 벤더마다 대소문자가 달라 소문자로 맞춘다. */
export function assertCatalogParity(emission, actual) {
  const problems = [];
  for (const kind of Object.keys(emission.expected)) {
    const expected = new Set(emission.expected[kind].map(item => item.toLowerCase()));
    const found = new Set((actual[kind] ?? []).map(item => item.toLowerCase()));
    const missing = [...expected].filter(item => !found.has(item));
    const unexpected = [...found].filter(item => !expected.has(item));
    if (missing.length) problems.push(`${kind} 누락 ${missing.length}: ${missing.slice(0, 8).join(', ')}`);
    if (unexpected.length) problems.push(`${kind} 초과 ${unexpected.length}: ${unexpected.slice(0, 8).join(', ')}`);
  }
  if (problems.length) {
    const error = new Error(`${emission.vendor}: 대상 DB 가 번역 결과와 다르다 — ${problems.join(' / ')}`);
    error.code = 'VENDOR_PARITY_FAILED';
    throw error;
  }
}
