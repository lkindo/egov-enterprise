// Catalog for the item store (ADR-0055): the requirement record format used in
// Korean public-sector RFPs and the information-engineering deliverable types.
// Everything here is data. Screens, prompts, validation and rendering read it, so
// adding a deliverable type means adding one entry.

export const REQUIREMENT_KIND = 'requirement';

/** Requirement classes used by public-sector RFP requirement statements. */
export const REQUIREMENT_CATEGORIES = [
  { code: 'SFR', name: '기능 요구사항', hint: '목표 시스템이 수행해야 하거나 사용자가 할 수 있어야 하는 기능' },
  { code: 'ECR', name: '시스템 장비구성 요구사항', hint: '도입할 하드웨어·소프트웨어·네트워크의 규격과 구성' },
  { code: 'PER', name: '성능 요구사항', hint: '처리 속도·시간, 처리량, 용량, 가용성' },
  { code: 'SIR', name: '인터페이스 요구사항', hint: '다른 시스템·장비와의 연계, 사용자 인터페이스 조건' },
  { code: 'DAR', name: '데이터 요구사항', hint: '데이터 구축·전환·표준화·품질·보존' },
  { code: 'TER', name: '테스트 요구사항', hint: '시험 유형, 환경, 절차, 합격 기준' },
  { code: 'SER', name: '보안 요구사항', hint: '접근 통제, 암호화, 개인정보 보호, 감사 기록' },
  { code: 'QUR', name: '품질 요구사항', hint: '신뢰성, 사용성, 유지보수성, 이식성 등 품질 목표' },
  { code: 'COR', name: '제약사항', hint: '기술·표준·법령·일정 등 설계와 구현의 제약' },
  { code: 'PMR', name: '프로젝트 관리 요구사항', hint: '일정·위험·품질·형상 관리와 보고 체계' },
  { code: 'PSR', name: '프로젝트 지원 요구사항', hint: '교육, 기술 지원, 하자 보수, 유지 관리' },
];
export const CATEGORY_CODES = REQUIREMENT_CATEGORIES.map(category => category.code);

const text = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra });
const list = (key, label, extra = {}) => ({ key, label, type: 'list', ...extra });
const rows = (key, label, columns, extra = {}) => ({ key, label, type: 'rows', columns, ...extra });

/** Field limits shared by validation, prompts and the editor. */
export const FIELD_LIMITS = { name: 120, text: 2000, listItems: 30, listItem: 400, rows: 60, cell: 300 };

export const REQUIREMENT_FIELDS = [
  text('category', '요구사항 분류', { required: true, options: CATEGORY_CODES }),
  text('definition', '정의', { required: true }),
  list('details', '세부 내용', { required: true }),
  list('outputs', '산출 정보'),
  list('constraints', '제약·전제'),
  text('verification', '검증 방법·기준'),
  text('priority', '중요도', { options: ['상', '중', '하'] }),
];

/**
 * Deliverable types. `look` tells the model what kind of statement belongs to
 * the type; it is the only type-specific prompt text.
 */
export const ARTIFACT_TYPES = [
  { id: 'function-tree', name: '기능분해도', phase: '분석', prefix: 'FN', noun: '기능', defaultEnabled: true,
    look: '업무 기능의 이름과 상·하위 관계, 기능이 하는 일',
    fields: [text('parent', '상위 기능'), text('description', '기능 설명', { required: true })] },
  { id: 'process-def', name: '프로세스정의서', phase: '분석', prefix: 'PR', noun: '프로세스',
    look: '업무 처리 절차: 누가 무엇을 받아 어떤 규칙으로 처리해 무엇을 내는지',
    fields: [text('description', '프로세스 설명', { required: true }), text('actor', '수행 주체', { required: true }), text('trigger', '시작 조건'),
      list('inputs', '입력'), list('outputs', '출력'), list('steps', '처리 절차', { required: true }), list('rules', '업무 규칙'),
      rows('entityUsage', '엔터티 사용', [['entity', '엔터티'], ['usage', 'C/R/U/D']])] },
  { id: 'business-flow', name: '업무흐름도', phase: '분석', prefix: 'BF', noun: '업무 흐름',
    look: '여러 담당자·부서·시스템 사이에서 업무가 넘어가는 순서와 분기',
    fields: [text('description', '흐름 설명', { required: true }), list('participants', '참여자', { required: true }),
      rows('steps', '단계', [['order', '순서'], ['actor', '수행 주체'], ['activity', '활동'], ['next', '다음 단계·분기']], { required: true })] },
  { id: 'entity-def', name: '엔터티정의서', phase: '분석', prefix: 'EN', noun: '엔터티', defaultEnabled: true,
    look: '관리해야 하는 정보의 단위(대상·문서·거래)와 그 항목, 식별 방법, 다른 정보와의 관계',
    fields: [text('description', '엔터티 설명', { required: true }), text('identifier', '식별자'),
      rows('attributes', '속성', [['name', '속성명'], ['description', '설명'], ['type', '유형·길이'], ['required', '필수']], { required: true }),
      rows('relations', '관계', [['target', '대상 엔터티'], ['cardinality', '관계 수'], ['description', '설명']])] },
  { id: 'interface-def', name: '인터페이스정의서', phase: '분석', prefix: 'IF', noun: '인터페이스',
    look: '다른 시스템·기관과 주고받는 정보: 상대, 방향, 방식, 주기, 항목',
    fields: [text('description', '연계 설명', { required: true }), text('sender', '송신', { required: true }), text('receiver', '수신', { required: true }),
      text('method', '연계 방식'), text('cycle', '주기'), list('data', '연계 항목')] },
  { id: 'as-is', name: '현행시스템분석서', phase: '분석', prefix: 'AS', noun: '현행 분석 항목',
    look: '지금 쓰는 시스템·업무 방식의 현황과 문제점, 개선 방향',
    fields: [text('description', '현황', { required: true }), list('problems', '문제점'), list('improvements', '개선 방향')] },
  { id: 'menu-tree', name: '메뉴구조도', phase: '설계', prefix: 'MN', noun: '메뉴',
    look: '사용자에게 보이는 메뉴의 이름과 계층, 메뉴가 여는 화면, 사용할 수 있는 역할',
    fields: [text('parent', '상위 메뉴'), text('description', '메뉴 설명', { required: true }), text('screen', '연결 화면'), list('roles', '사용 역할')] },
  { id: 'screen-def', name: '화면설계서', phase: '설계', prefix: 'SC', noun: '화면', defaultEnabled: true,
    look: '화면의 목적, 입력·조회 항목, 버튼과 동작, 사용할 수 있는 역할',
    fields: [text('description', '화면 설명', { required: true }), text('screenType', '화면 유형'),
      rows('inputs', '입력 항목', [['name', '항목'], ['type', '유형'], ['required', '필수'], ['note', '비고']]),
      list('outputs', '조회·출력 항목'), rows('actions', '버튼·이벤트', [['name', '이름'], ['behavior', '동작']], { required: true }),
      text('process', '관련 프로세스'), list('roles', '사용 역할')] },
  { id: 'program-list', name: '프로그램목록', phase: '설계', prefix: 'PG', noun: '프로그램',
    look: '구현 단위(화면 프로그램·배치·API)의 이름과 유형, 다루는 화면과 테이블',
    fields: [text('description', '프로그램 설명', { required: true }), text('programType', '유형', { required: true }), text('screen', '관련 화면'), list('tables', '사용 테이블')] },
  { id: 'table-def', name: '테이블정의서', phase: '설계', prefix: 'TB', noun: '테이블',
    look: '물리 테이블과 컬럼의 이름, 유형, 키, 널 허용',
    fields: [text('description', '테이블 설명', { required: true }), text('entity', '대응 엔터티'),
      rows('columns', '컬럼', [['name', '컬럼명'], ['logicalName', '한글명'], ['type', '유형·길이'], ['nullable', '널 허용'], ['key', '키'], ['note', '비고']], { required: true })] },
  { id: 'code-def', name: '코드정의서', phase: '설계', prefix: 'CD', noun: '코드 그룹',
    look: '정해진 값 목록(구분·상태·유형 코드)과 각 값의 뜻',
    fields: [text('description', '코드 그룹 설명', { required: true }), rows('codes', '코드', [['code', '코드'], ['name', '코드명'], ['note', '비고']], { required: true })] },
  { id: 'interface-design', name: '인터페이스설계서', phase: '설계', prefix: 'ID', noun: '인터페이스 설계',
    look: '연계의 기술 명세: 프로토콜, 전문·메시지 형식, 필드, 오류 처리',
    fields: [text('description', '설계 설명', { required: true }), text('protocol', '프로토콜·방식', { required: true }), text('format', '전문·메시지 형식'),
      rows('fields', '필드', [['name', '필드'], ['type', '유형'], ['note', '비고']]), text('errorHandling', '오류 처리')] },
  { id: 'batch-design', name: '배치설계서', phase: '설계', prefix: 'BT', noun: '배치 작업',
    look: '정해진 시각·주기로 사람 없이 도는 작업: 주기, 입력, 출력, 실패 처리',
    fields: [text('description', '작업 설명', { required: true }), text('schedule', '실행 주기', { required: true }), list('inputs', '입력'), list('outputs', '출력'), text('errorHandling', '실패 처리')] },
];
export const ARTIFACT_IDS = ARTIFACT_TYPES.map(type => type.id);
const TYPES = new Map(ARTIFACT_TYPES.map(type => [type.id, type]));

/** Documents rendered from other items; they hold no items of their own. */
export const DERIVED_DOCUMENTS = [
  { id: 'requirements', name: '요구사항정의서', from: [REQUIREMENT_KIND] },
  { id: 'rtm', name: '요구사항추적표', from: [REQUIREMENT_KIND] },
  { id: 'attribute-def', name: '속성정의서', from: ['entity-def'] },
  { id: 'erd', name: '논리 ERD', from: ['entity-def'] },
  { id: 'crud-matrix', name: 'CRUD 매트릭스', from: ['process-def', 'entity-def'] },
];

export const isKind = kind => kind === REQUIREMENT_KIND || TYPES.has(kind);
export const artifactType = id => TYPES.get(id) ?? null;
export const kindName = kind => kind === REQUIREMENT_KIND ? '요구사항' : TYPES.get(kind)?.name ?? kind;
export const kindPrefix = kind => kind === REQUIREMENT_KIND ? 'REQ' : TYPES.get(kind)?.prefix;
export const fieldsOf = kind => kind === REQUIREMENT_KIND ? REQUIREMENT_FIELDS : TYPES.get(kind)?.fields ?? [];

// Trimmed again after the cut so that normalising twice gives the same value.
const clean = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit).trim() : '';
/** A list entry longer than the limit is split at sentence ends, so a long statement is kept whole across entries instead of being cut. */
function pieces(value, limit) {
  let rest = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  const result = [];
  while (rest.length > limit) {
    const window = rest.slice(0, limit), cut = Math.max(window.lastIndexOf('. '), window.lastIndexOf('; '), window.lastIndexOf(', '));
    const size = cut > limit / 3 ? cut + 1 : limit;
    result.push(rest.slice(0, size).trim()); rest = rest.slice(size).trim();
  }
  if (rest) result.push(rest);
  return result;
}

/**
 * Normalises one field value to its declared shape. Unknown keys, wrong types
 * and empty entries are dropped rather than stored, so a model reply can never
 * widen an item beyond the catalog.
 */
export function normalizeField(spec, value) {
  if (spec.type === 'text') {
    const result = clean(value, FIELD_LIMITS.text);
    return spec.options && result && !spec.options.includes(result) ? '' : result;
  }
  if (!Array.isArray(value)) return [];
  if (spec.type === 'list') return [...new Set(value.flatMap(entry => pieces(entry, FIELD_LIMITS.listItem)))].slice(0, FIELD_LIMITS.listItems);
  const keys = spec.columns.map(([key]) => key), seen = new Set(), result = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const row = Object.fromEntries(keys.map(key => [key, clean(entry[key], FIELD_LIMITS.cell)]));
    const identity = JSON.stringify(row);
    if (!row[keys[0]] || seen.has(identity)) continue;
    seen.add(identity); result.push(row);
    if (result.length >= FIELD_LIMITS.rows) break;
  }
  return result;
}
export function normalizeFields(kind, fields) {
  const source = fields && typeof fields === 'object' && !Array.isArray(fields) ? fields : {};
  return Object.fromEntries(fieldsOf(kind).map(spec => [spec.key, normalizeField(spec, source[spec.key])]));
}
export const isFilled = value => Array.isArray(value) ? value.length > 0 : Boolean(value);

/** Row identity for additive merges: the first column names the row. */
export const rowKey = (spec, row) => String(row[spec.columns[0][0]] ?? '').toLowerCase();

/**
 * Additive merge used for AI contributions: text is set only where empty,
 * lists and rows gain entries. Nothing a person wrote is replaced or removed.
 */
export function mergeFieldsAdditive(kind, current, incoming) {
  const next = normalizeFields(kind, current), extra = normalizeFields(kind, incoming), changed = [], added = {};
  for (const spec of fieldsOf(kind)) {
    const before = next[spec.key], addition = extra[spec.key];
    if (!isFilled(addition)) continue;
    if (spec.type === 'text') { if (!before) { next[spec.key] = addition; added[spec.key] = addition; changed.push(spec.key); } continue; }
    const identity = entry => spec.type === 'list' ? entry.toLowerCase() : rowKey(spec, entry);
    const known = new Set(before.map(identity));
    const fresh = addition.filter(entry => !known.has(identity(entry)));
    if (!fresh.length) continue;
    const merged = normalizeField(spec, [...before, ...fresh]);
    if (merged.length === before.length) continue;
    next[spec.key] = merged; added[spec.key] = merged.slice(before.length); changed.push(spec.key);
  }
  // `added` holds only what the merge contributes, for showing a change proposal.
  return { fields: next, changed, added };
}

/** One-line text of a field value, for prompts, search and documents. */
export function fieldText(spec, value) {
  if (!isFilled(value)) return '';
  if (spec.type === 'text') return value;
  if (spec.type === 'list') return value.join('; ');
  return value.map(row => spec.columns.map(([key]) => row[key]).filter(Boolean).join(' / ')).join('; ');
}

/** JSON schema of one kind's fields, for the model's structured output. */
export function fieldsSchema(kind) {
  const properties = {};
  for (const spec of fieldsOf(kind)) {
    properties[spec.key] = spec.type === 'text' ? (spec.options ? { type: 'string', enum: ['', ...spec.options] } : { type: 'string' })
      : spec.type === 'list' ? { type: 'array', items: { type: 'string' } }
      : { type: 'array', items: { type: 'object', additionalProperties: false, properties: Object.fromEntries(spec.columns.map(([key]) => [key, { type: 'string' }])), required: [spec.columns[0][0]] } };
  }
  return { type: 'object', additionalProperties: false, properties };
}

/** Compact field guide sent to the model instead of prose instructions per type. */
export const fieldGuide = kind => fieldsOf(kind).map(spec => `${spec.key}(${spec.label}${spec.required ? ', 필수' : ''}${spec.type === 'rows' ? `: ${spec.columns.map(([key, label]) => `${key}=${label}`).join(', ')}` : spec.type === 'list' ? ': 목록' : ''}${spec.options ? `: ${spec.options.join('|')}` : ''})`).join('; ');
