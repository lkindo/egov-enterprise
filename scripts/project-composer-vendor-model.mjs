/**
 * 기준 PostgreSQL 의 최종 스키마를 벤더 중립 모델로 옮긴다(ADR-0047 결정 1, 설계서 D-3).
 *
 * 모델은 닫힌 문법이다. 모르는 타입·기본값·CHECK·인덱스·트리거는 건너뛰지 않고 번역을 멈춘다.
 * 조용히 빠진 제약은 벤더 프로젝트에서 사라진 줄도 모르게 되기 때문이다.
 */
import { createHash } from 'node:crypto';

export class VendorTranslationGap extends Error {
  constructor(message) {
    super(message);
    this.name = 'VendorTranslationGap';
    this.code = 'VENDOR_TRANSLATION_GAP';
  }
}

export const gap = message => { throw new VendorTranslationGap(message); };

/** 검토한 트리거 함수. 본문이 바뀌면 의도를 다시 검토할 때까지 번역을 멈춘다(V2_143 은 선언을 두고 본문만 바꿨다). */
export const REVIEWED_TRIGGER_FUNCTIONS = Object.freeze({
  fn_adt_log_chg_prhb: { hash: 'd710f47f8368bd8c981e2c1794daaac6a481f1f21fc23bcc7f225c46cfa867ee', intent: { kind: 'append-only', permit: 'app.audit_retention' } },
  fn_cms_rvsn_chg_prhb: { hash: 'f3ddd4592874552862c049d4cdcccd58c4292816d5e907d6b85f4ffb9a5fe814', intent: { kind: 'append-only', permit: 'nuri.cms_purge' } },
  fn_sync_sys_log_prcs_req_msec: { hash: 'a16f3a7b8d31103ee017738a1c78973e7c4403432bb8e3d5374a3323e018f8d6', intent: { kind: 'sync-pair', legacy: 'prcs_tm', current: 'prcs_req_msec' } },
  fn_sync_web_log_prcs_req_msec: { hash: '7f3fc31f92c6b659445b8665f07216727ed3b3ee7c79ea06027a6fe43e9e1be5', intent: { kind: 'sync-pair', legacy: 'prcs_tm', current: 'prcs_req_msec' } },
});

/** schemaSnapshotSql 은 PostgreSQL 번들 해시의 입력이라 건드리지 않고, 모델에만 필요한 사실을 따로 읽는다. */
export function vendorSnapshotSql() {
  return `SELECT json_build_object(
    'functions', COALESCE((SELECT json_agg(json_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid)) ORDER BY p.proname)
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prorettype='trigger'::regtype),'[]'::json),
    'comments', COALESCE((SELECT json_agg(json_build_object('table',c.relname,'column',a.attname,'comment',d.description) ORDER BY c.relname,a.attnum)
      FROM pg_description d JOIN pg_class c ON c.oid=d.objoid JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=d.objsubid AND d.objsubid>0
      WHERE n.nspname='public' AND c.relkind='r' AND d.classoid='pg_class'::regclass),'[]'::json),
    'identitySequences', COALESCE((SELECT json_agg(s.relname ORDER BY s.relname)
      FROM pg_class s JOIN pg_namespace n ON n.oid=s.relnamespace JOIN pg_depend d ON d.objid=s.oid AND d.deptype='i'
      WHERE n.nspname='public' AND s.relkind='S'),'[]'::json),
    'sequenceValues', COALESCE((SELECT json_agg(json_build_object('name',sequencename,'last',last_value) ORDER BY sequencename)
      FROM pg_sequences WHERE schemaname='public'),'[]'::json)
  )::text;`;
}

const functionHash = definition => createHash('sha256').update(definition.replace(/\r\n/g, '\n').trim()).digest('hex');

const CASTS = new Set(['text', 'character varying', 'numeric', 'integer', 'bigint', 'bpchar', 'interval']);
const COMPARISONS = new Set(['=', '<>', '>=', '<=', '>', '<']);
const TOKEN = /\s*(?:('(?:[^']|'')*')|::((?:character varying|[a-z]+)(?:\[\])?)|(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(<>|>=|<=|[=<>~+(),\[\]]))/y;

function tokenize(text) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const start = TOKEN.lastIndex;
    const match = TOKEN.exec(text);
    if (!match) {
      if (!text.slice(start).trim()) break;
      gap(`CHECK 를 토큰으로 나누지 못했다: ${text.slice(start, start + 40)}`);
    }
    if (match[1] !== undefined) tokens.push({ type: 'string', value: match[1].slice(1, -1).replaceAll("''", "'") });
    else if (match[2] !== undefined) tokens.push({ type: 'cast', value: match[2].replace('[]', '') });
    else if (match[3] !== undefined) tokens.push({ type: 'number', value: Number(match[3]) });
    else if (match[4] !== undefined) tokens.push({ type: 'word', value: match[4] });
    else tokens.push({ type: 'symbol', value: match[5] });
  }
  return tokens;
}

const BOOLEAN_NODES = new Set(['and', 'or', 'compare', 'isNull', 'isNotNull', 'in', 'regex', 'iff']);
const TEXT_CASTS = new Set(['text', 'character varying', 'bpchar']);
const NUMBER_CASTS = new Set(['numeric', 'integer', 'bigint']);
/** 같은 계열 안의 캐스트만 버릴 수 있다. 숫자를 문자로 바꾼 비교처럼 뜻이 달라지는 캐스트는 멈춘다. */
const castKeepsMeaning = (kind, cast) => (['varchar', 'text', 'json'].includes(kind) ? TEXT_CASTS.has(cast)
  : ['integer', 'bigint', 'numeric'].includes(kind) && NUMBER_CASTS.has(cast));

/** pg_get_constraintdef 가 낸 식을 트리로 옮긴다. 이 문법 밖의 식은 번역을 멈춘다. */
export function parseExpression(text, columns, kinds = new Map()) {
  const tokens = tokenize(text);
  let position = 0;
  const peek = () => tokens[position];
  const isWord = (word, token = peek()) => token?.type === 'word' && token.value === word;
  const isSymbol = (symbol, token = peek()) => token?.type === 'symbol' && token.value === symbol;
  const expect = symbol => { if (!isSymbol(symbol)) gap(`CHECK 문법 오류(${symbol} 필요): ${text}`); position += 1; };
  const skipCasts = () => {
    const seen = [];
    while (peek()?.type === 'cast') {
      if (!CASTS.has(peek().value)) gap(`모르는 캐스트 ${peek().value}: ${text}`);
      seen.push(peek().value);
      position += 1;
    }
    return seen;
  };
  const assertColumnCasts = (node, casts) => {
    if (node.op !== 'column' || !kinds.has(node.name)) return;
    for (const cast of casts) if (!castKeepsMeaning(kinds.get(node.name), cast)) gap(`뜻이 달라지는 캐스트 ${node.name}::${cast}: ${text}`);
  };
  const stringList = () => {
    expect('[');
    const values = [];
    do {
      if (isSymbol(',')) position += 1;
      const token = tokens[position++];
      if (token?.type !== 'string') gap(`ARRAY 는 문자열만 받는다: ${text}`);
      skipCasts();
      values.push(token.value);
    } while (isSymbol(','));
    expect(']');
    return values;
  };

  function primary() {
    const token = peek();
    if (!token) gap(`CHECK 가 도중에 끝났다: ${text}`);
    if (isSymbol('(')) {
      position += 1;
      const inner = or();
      expect(')');
      assertColumnCasts(inner, skipCasts());
      return inner;
    }
    if (token.type === 'string') {
      position += 1;
      const casts = skipCasts();
      if (!casts.includes('interval')) return { op: 'string', value: token.value };
      const match = token.value.match(/^(\d{2}):(\d{2}):(\d{2})$/);
      if (!match) gap(`모르는 interval: ${token.value}`);
      return { op: 'interval', seconds: Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) };
    }
    if (token.type === 'number') {
      position += 1;
      skipCasts();
      return { op: 'number', value: token.value };
    }
    if (token.type !== 'word') gap(`CHECK 문법 오류: ${text}`);
    position += 1;
    if (isSymbol('(')) {
      position += 1;
      const args = [or()];
      while (isSymbol(',')) { position += 1; args.push(or()); }
      expect(')');
      skipCasts();
      const single = () => { if (args.length !== 1) gap(`${token.value} 의 인자 수가 다르다: ${text}`); return args[0]; };
      if (token.value === 'char_length') return { op: 'charLength', arg: single() };
      if (token.value === 'octet_length') return { op: 'octetLength', arg: single() };
      if (token.value === 'btrim') return { op: 'trim', arg: single() };
      if (token.value === 'jsonb_typeof') return { op: 'jsonType', arg: single() };
      if (token.value === 'COALESCE') {
        if (args.length !== 2 || args[0].op !== 'column' || args[1].op !== 'string') gap(`이 COALESCE 는 문법 밖이다: ${text}`);
        return { op: 'coalesce', arg: args[0], fallback: args[1].value };
      }
      gap(`모르는 함수 ${token.value}: ${text}`);
    }
    if (!columns.includes(token.value)) gap(`모르는 컬럼 ${token.value}: ${text}`);
    const node = { op: 'column', name: token.value };
    assertColumnCasts(node, skipCasts());
    return node;
  }

  function additive() {
    const left = primary();
    if (!isSymbol('+')) return left;
    position += 1;
    const right = primary();
    if (left.op !== 'column' || right.op !== 'interval') gap(`이 덧셈은 문법 밖이다: ${text}`);
    return { op: 'addSeconds', arg: left, seconds: right.seconds };
  }

  function comparison() {
    const left = additive();
    if (isWord('IS')) {
      position += 1;
      const negated = isWord('NOT');
      if (negated) position += 1;
      if (!isWord('NULL')) gap(`이 IS 는 문법 밖이다: ${text}`);
      position += 1;
      return { op: negated ? 'isNotNull' : 'isNull', arg: left };
    }
    const token = peek();
    if (token?.type !== 'symbol') return left;
    if (token.value === '~') {
      position += 1;
      const pattern = tokens[position++];
      if (pattern?.type !== 'string') gap(`정규식은 리터럴만 받는다: ${text}`);
      skipCasts();
      return { op: 'regex', arg: left, pattern: pattern.value };
    }
    if (!COMPARISONS.has(token.value)) return left;
    position += 1;
    if (isWord('ANY')) {
      if (token.value !== '=') gap(`= ANY 만 받는다: ${text}`);
      position += 1;
      expect('(');
      const wrapped = isSymbol('(');
      if (wrapped) position += 1;
      if (!isWord('ARRAY')) gap(`ANY 는 ARRAY 만 받는다: ${text}`);
      position += 1;
      const values = stringList();
      skipCasts();
      if (wrapped) { expect(')'); skipCasts(); }
      expect(')');
      return { op: 'in', arg: left, values };
    }
    const right = additive();
    if (BOOLEAN_NODES.has(left.op) && BOOLEAN_NODES.has(right.op)) {
      if (token.value !== '=') gap(`논리값 비교는 = 만 받는다: ${text}`);
      return { op: 'iff', left, right };
    }
    return { op: 'compare', operator: token.value, left, right };
  }

  const chain = (word, op, next) => () => {
    const args = [next()];
    while (isWord(word)) { position += 1; args.push(next()); }
    return args.length === 1 ? args[0] : { op, args };
  };
  const and = chain('AND', 'and', comparison);
  const or = chain('OR', 'or', and);

  const tree = or();
  if (position !== tokens.length) gap(`CHECK 를 끝까지 읽지 못했다: ${text}`);
  return tree;
}

/** 식이 읽는 컬럼. 위반식의 NULL 가드와 표현식 재사용이 쓴다. */
export function columnsIn(node, found = new Set()) {
  if (!node || typeof node !== 'object') return found;
  if (node.op === 'column') found.add(node.name);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => columnsIn(item, found));
    else if (typeof value === 'object') columnsIn(value, found);
  }
  return found;
}

function logicalType(column) {
  switch (column.data_type) {
    case 'character varying':
      if (!column.character_maximum_length) gap(`길이 없는 varchar: ${column.table_name}.${column.column_name}`);
      return { kind: 'varchar', length: column.character_maximum_length };
    case 'text': return { kind: 'text' };
    case 'jsonb': return { kind: 'json' };
    case 'uuid': return { kind: 'uuid' };
    case 'bytea': return { kind: 'binary' };
    case 'timestamp without time zone': return { kind: 'timestamp', precision: column.datetime_precision ?? 6 };
    case 'date': return { kind: 'date' };
    case 'bigint': return { kind: 'bigint' };
    case 'integer': return { kind: 'integer' };
    case 'numeric': return { kind: 'numeric', precision: column.numeric_precision ?? null, scale: column.numeric_scale ?? null };
    default: return gap(`모르는 타입 ${column.data_type}: ${column.table_name}.${column.column_name}`);
  }
}

function logicalDefault(column) {
  const value = column.column_default;
  if (value === null || value === undefined) return null;
  let match = value.match(/^nextval\('([a-z0-9_]+)'::regclass\)$/);
  if (match) return { kind: 'sequence', name: match[1] };
  if (value === 'gen_random_uuid()') return { kind: 'uuid' };
  if (value === 'CURRENT_TIMESTAMP') return { kind: 'now' };
  if (value === "to_char((now() AT TIME ZONE 'Asia/Seoul'::text), 'YYYYMMDD'::text)") return { kind: 'kst-date' };
  if (/^-?\d+(\.\d+)?$/.test(value)) return { kind: 'number', value: Number(value) };
  match = value.match(/^'((?:[^']|'')*)'::character varying$/);
  if (match) return { kind: 'string', value: match[1].replaceAll("''", "'") };
  return gap(`모르는 기본값 ${value}: ${column.table_name}.${column.column_name}`);
}

const splitColumns = text => text.split(',').map(item => item.trim().replaceAll('"', ''));

function parseConstraint(row, columns, kinds) {
  if (row.validated === false) gap(`검증되지 않은 제약: ${row.name}`);
  const definition = row.definition;
  if (row.type === 'p' || row.type === 'u') {
    const match = definition.match(/^(?:PRIMARY KEY|UNIQUE) \(([^)]*)\)$/);
    if (!match) gap(`모르는 키 정의 ${row.name}: ${definition}`);
    return { name: row.name, columns: splitColumns(match[1]) };
  }
  if (row.type === 'f') {
    const match = definition.match(/^FOREIGN KEY \(([^)]*)\) REFERENCES ([a-z0-9_]+)\(([^)]*)\)(.*)$/);
    if (!match) gap(`모르는 FK 정의 ${row.name}: ${definition}`);
    const tail = match[4].trim();
    if (!['', 'ON DELETE CASCADE', 'DEFERRABLE INITIALLY DEFERRED'].includes(tail)) gap(`모르는 FK 동작 ${row.name}: ${tail}`);
    return { name: row.name, columns: splitColumns(match[1]), parentTable: match[2], parentColumns: splitColumns(match[3]),
      onDeleteCascade: tail === 'ON DELETE CASCADE', deferrable: tail === 'DEFERRABLE INITIALLY DEFERRED' };
  }
  if (row.type === 'c') {
    const match = definition.match(/^CHECK \((.*)\)$/s);
    if (!match) gap(`모르는 CHECK 정의 ${row.name}: ${definition}`);
    return { name: row.name, expression: parseExpression(match[1], columns, kinds) };
  }
  return gap(`모르는 제약 종류 ${row.type}: ${row.name}`);
}

function parseIndex(row, columns, kinds) {
  const match = row.definition.match(/^CREATE (UNIQUE )?INDEX (\S+) ON public\.(\S+) USING (btree|gin) \((.*?)\)(?: WHERE (.*))?$/s);
  if (!match) gap(`모르는 인덱스 정의 ${row.name}: ${row.definition}`);
  const [, unique, , , method, body, where] = match;
  if (method === 'gin') {
    if (!/^[a-z0-9_]+ gin_trgm_ops$/.test(body) || unique) gap(`모르는 GIN 인덱스 ${row.name}: ${row.definition}`);
    return { name: row.name, unique: false, method: 'trigram', columns: [{ name: body.split(' ')[0] }], where: null };
  }
  const trimmed = body.match(/^btrim\(\(([a-z0-9_]+)\)::text\)$/);
  if (trimmed) {
    // 조건부·유일 표현식 인덱스는 벤더마다 뜻이 달라진다. 지금 스키마에 없으니 문법 밖으로 둔다.
    if (unique || where) gap(`표현식 인덱스는 조건 없는 일반 인덱스만 받는다: ${row.name}`);
    return { name: row.name, unique: false, method: 'btree', columns: [{ name: trimmed[1], expression: 'trim' }], where: null };
  }
  const parts = splitColumns(body).map(part => {
    const piece = part.match(/^([a-z0-9_]+)( DESC)?$/);
    if (!piece) gap(`모르는 인덱스 컬럼 ${row.name}: ${part}`);
    return { name: piece[1], descending: Boolean(piece[2]) };
  });
  return { name: row.name, unique: Boolean(unique), method: 'btree', columns: parts, where: where ? parseExpression(where, columns, kinds) : null };
}

function parseTrigger(row, functions) {
  const match = row.definition.match(/^CREATE TRIGGER (\S+) BEFORE (.+) ON ([a-z0-9_]+) FOR EACH ROW EXECUTE FUNCTION ([a-z0-9_]+)\(\)$/);
  if (!match) gap(`모르는 트리거 정의 ${row.name}: ${row.definition}`);
  const reviewed = REVIEWED_TRIGGER_FUNCTIONS[match[4]];
  if (!reviewed) gap(`검토하지 않은 트리거 함수 ${match[4]}`);
  const body = functions.get(match[4]);
  if (body === undefined) gap(`트리거 함수 본문을 읽지 못했다: ${match[4]}`);
  const hash = functionHash(body);
  if (hash !== reviewed.hash) gap(`트리거 함수 ${match[4]} 의 본문이 바뀌었다 — 의도를 다시 검토한다(현재 해시 ${hash})`);
  const events = { 'append-only': 'DELETE OR UPDATE', 'sync-pair': 'INSERT OR UPDATE OF prcs_tm, prcs_req_msec' }[reviewed.intent.kind];
  if (match[2] !== events) gap(`트리거 ${row.name} 의 시점이 검토한 의도와 다르다: ${match[2]}`);
  return { name: row.name, ...reviewed.intent };
}

/** 스키마 스냅숏과 함수·주석을 중립 모델로 옮긴다. 순서는 입력과 무관하게 고정한다. */
export function buildVendorModel({ snapshot, extras }) {
  for (const key of ['columns', 'constraints', 'indexes', 'triggers', 'sequences']) {
    if (!Array.isArray(snapshot?.[key])) gap(`스냅숏에 ${key} 가 없다.`);
  }
  for (const row of snapshot.constraints) if (!['p', 'u', 'f', 'c'].includes(row.type)) gap(`모르는 제약 종류 ${row.type}: ${row.name}`);
  const functions = new Map((extras?.functions ?? []).map(row => [row.name, row.definition]));
  const comments = new Map((extras?.comments ?? []).map(row => [`${row.table}.${row.column ?? ''}`, row.comment]));
  const identitySequences = new Set(extras?.identitySequences ?? []);
  const lastValues = new Map((extras?.sequenceValues ?? []).map(row => [row.name, row.last]));
  const names = [...new Set(snapshot.columns.map(row => row.table_name))].sort();
  const constraintNames = new Set(snapshot.constraints.map(row => row.name));
  const tables = names.map(name => {
    const rows = snapshot.columns.filter(row => row.table_name === name).sort((a, b) => a.ordinal_position - b.ordinal_position);
    const columnNames = rows.map(row => row.column_name);
    const kinds = new Map(rows.map(row => [row.column_name, logicalType(row).kind]));
    const owned = type => snapshot.constraints.filter(row => row.table_name === name && row.type === type).map(row => parseConstraint(row, columnNames, kinds));
    const columns = rows.map(row => {
      if (row.is_generated !== 'NEVER') gap(`생성 컬럼은 문법 밖이다: ${name}.${row.column_name}`);
      if (row.is_identity === 'YES' && row.identity_generation !== 'BY DEFAULT') gap(`GENERATED ALWAYS 는 문법 밖이다: ${name}.${row.column_name}`);
      return { name: row.column_name, type: logicalType(row), nullable: row.is_nullable === 'YES', identity: row.is_identity === 'YES',
        default: logicalDefault(row), comment: comments.get(`${name}.${row.column_name}`) ?? null };
    });
    const [primaryKey = null, ...extraKeys] = owned('p');
    if (extraKeys.length) gap(`기본 키가 둘이다: ${name}`);
    return { name, comment: comments.get(`${name}.`) ?? null, columns, primaryKey, uniques: owned('u'), foreignKeys: owned('f'), checks: owned('c'),
      indexes: snapshot.indexes.filter(row => row.table_name === name && !constraintNames.has(row.name)).map(row => parseIndex(row, columnNames, kinds)),
      triggers: snapshot.triggers.filter(row => row.table_name === name).map(row => parseTrigger(row, functions)) };
  });
  const sequences = snapshot.sequences.filter(row => !identitySequences.has(row.name)).map(row => ({
    name: row.name, increment: Number(row.increment_by), start: Number(row.start_value), last: lastValues.get(row.name) ?? null,
  })).sort((a, b) => a.name.localeCompare(b.name));
  return { schemaVersion: 1, tables, sequences };
}

/** 식 안에 해당 연산이 있는가. */
export function containsOp(node, op) {
  if (!node || typeof node !== 'object') return false;
  if (node.op === op) return true;
  return Object.values(node).some(value => (Array.isArray(value) ? value.some(item => containsOp(item, op)) : containsOp(value, op)));
}

/** 키·인덱스·FK 양쪽에 쓰이는 컬럼. 긴 문자열을 LOB 로 바꿀 수 없는 자리다. */
export function keyColumns(model) {
  const keys = new Set();
  const add = (table, columns) => columns.forEach(column => keys.add(`${table}.${column}`));
  for (const table of model.tables) {
    if (table.primaryKey) add(table.name, table.primaryKey.columns);
    table.uniques.forEach(unique => add(table.name, unique.columns));
    table.foreignKeys.forEach(key => { add(table.name, key.columns); add(key.parentTable, key.parentColumns); });
    table.indexes.forEach(index => add(table.name, index.columns.map(column => column.name)));
  }
  return keys;
}

/** 행이 있는 표의 FK 위상 순서. 자기 참조는 행 순서로 푼다. 빈 표의 순환은 시드와 무관하고, 행이 있는 표의 순환은 순서를 정할 수 없어 멈춘다. */
export function tablesInDependencyOrder(model, hasRows = () => true) {
  const byName = new Map(model.tables.filter(table => hasRows(table)).map(table => [table.name, table]));
  const order = [];
  const state = new Map();
  const visit = (name, path) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'open') gap(`FK 순환: ${[...path, name].join(' -> ')}`);
    state.set(name, 'open');
    for (const key of byName.get(name).foreignKeys) {
      if (key.parentTable !== name && byName.has(key.parentTable)) visit(key.parentTable, [...path, name]);
    }
    state.set(name, 'done');
    order.push(byName.get(name));
  };
  byName.forEach(table => visit(table.name, []));
  return order;
}
