/** Shared UI draft contract. This module has no network, DOM, storage, or execution access. */
const vendors = ['postgresql', 'oracle', 'mysql', 'mariadb', 'sqlserver'];
const profileFields = [
  ['vendor', 'DBMS', 'select', false, vendors],
  ['host', '호스트', 'text', true], ['port', '포트', 'port', false],
  ['database', '데이터베이스 이름', 'identifier', true], ['schema', '스키마', 'identifier', true],
  ['username', '접속 계정', 'text', true], ['password', '세션 비밀번호', 'password', true],
  ['oracleMode', 'Oracle 접속 방식', 'select', false, ['service', 'sid']],
  ['instance', 'SQL Server 인스턴스', 'identifier', true],
  ['tlsMode', 'TLS 요구 수준', 'select', false, ['verify-full', 'require', 'disable']],
  ['driverJar', '외부 JDBC JAR 경로', 'path', true],
];
export const routeCatalog = Object.freeze([
  ['start', '작업공간'], ['connect', 'DB 연결 준비'], ['source', '소스·스키마 자료'],
  ['review', '용어·변환 검토'], ['pipeline', '실행·리허설'], ['results', '결과·산출물'], ['ai', 'AI 도우미'],
].map(([route, label]) => Object.freeze({ route, label })));
export const fieldCatalog = Object.freeze([
  ...['source', 'target'].flatMap(role => profileFields.map(([name, label, type, sensitive, options]) => Object.freeze({
    id: `${role}-${name}`, label: `${role === 'source' ? '원천' : '대상'} ${label}`, route: 'connect', type, sensitive,
    ...(options ? { options: Object.freeze(role === 'target' && name === 'vendor' ? ['postgresql'] : [...options]) } : {}),
  }))),
  Object.freeze({ id: 'source-path', label: '소스 루트 절대 경로', route: 'source', type: 'path', sensitive: true }),
  Object.freeze({ id: 'source-upload-kind', label: '가져올 자료 종류', route: 'source', type: 'select', sensitive: false, options: Object.freeze(['zip', 'ddl']) }),
]);
const fields = new Map(fieldCatalog.map(item => [item.id, item]));
const fail = code => { throw Object.assign(new Error(code), { code }); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));
const isPath = value => /^(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+|\/[^/])/.test(value);
const forbiddenControl = /[\x00-\x1f\x7f]/;
const identifiers = /^[A-Za-z_][A-Za-z0-9_$#.-]{0,127}$/;

/** Only known editable controls can be changed. This never saves a profile or runs an operation. */
export function validateDraftPatches(patches, { values = {}, allowSensitive = true } = {}) {
  if (!Array.isArray(patches) || patches.length > 26) fail('CHAT_INVALID_PATCH');
  const seen = new Set(), result = [];
  for (const patch of patches) {
    if (!exact(patch, ['fieldId', 'value']) || typeof patch.fieldId !== 'string' || typeof patch.value !== 'string') fail('CHAT_INVALID_PATCH');
    const field = fields.get(patch.fieldId), value = patch.value;
    if (!field || seen.has(patch.fieldId) || (!allowSensitive && (field.sensitive || !field.options))) fail('CHAT_FIELD_NOT_ALLOWED');
    if (!value || value.length > (field.type === 'path' || field.type === 'password' ? 2048 : 255) || forbiddenControl.test(value)) fail('CHAT_INVALID_VALUE');
    if (field.options && !field.options.includes(value)) fail('CHAT_INVALID_VALUE');
    if (field.type === 'port' && (!/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535)) fail('CHAT_INVALID_VALUE');
    if (field.type === 'path' && (!isPath(value) || /[<>|]/.test(value))) fail('CHAT_INVALID_VALUE');
    if (field.type === 'identifier' && !identifiers.test(value)) fail('CHAT_INVALID_VALUE');
    if (patch.fieldId.endsWith('-host') && !/^(?:[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?|\[[A-Fa-f0-9:]+\])$/.test(value)) fail('CHAT_INVALID_VALUE');
    if (patch.fieldId.endsWith('-username') && /[;{}]/.test(value)) fail('CHAT_INVALID_VALUE');
    if (patch.fieldId.endsWith('-driverJar') && !/\.jar$/i.test(value)) fail('CHAT_INVALID_VALUE');
    seen.add(patch.fieldId); result.push({ fieldId: patch.fieldId, value });
  }
  const after = { ...values, ...Object.fromEntries(result.map(patch => [patch.fieldId, patch.value])) };
  for (const patch of result) {
    const role = patch.fieldId.split('-')[0];
    if (patch.fieldId.endsWith('-oracleMode') && after[`${role}-vendor`] !== 'oracle') fail('CHAT_VENDOR_MISMATCH');
    if (patch.fieldId.endsWith('-instance') && after[`${role}-vendor`] !== 'sqlserver') fail('CHAT_VENDOR_MISMATCH');
  }
  return result.sort((a, b) => Number(b.fieldId.endsWith('-vendor')) - Number(a.fieldId.endsWith('-vendor')));
}

const aliasGroups = [
  ['path', '소스\\s*(?:루트\\s*)?(?:절대\\s*)?(?:경로|폴더)|폴더\\s*경로|sourcePath|sourceRoot'],
  ['driverJar', '외부\\s*(?:JDBC\\s*)?(?:JAR|드라이버)\\s*(?:절대\\s*)?경로|driverJar|드라이버\\s*경로'],
  ['oracleMode', 'Oracle\\s*접속\\s*방식|오라클\\s*접속\\s*방식|oracleMode|접속\\s*방식'],
  ['oracleService', '(?:Oracle\\s*|오라클\\s*)?서비스\\s*(?:이름|명)'],
  ['oracleSid', '(?:Oracle\\s*|오라클\\s*)?SID'],
  ['database', '데이터베이스\\s*(?:이름|명)?|DB\\s*(?:이름|명)|database|dbname'],
  ['vendor', 'DBMS|vendor|DB\\s*종류|DB'],
  ['host', '호스트|서버\\s*주소|접속\\s*주소|host|주소'],
  ['port', '포트|port'], ['schema', '스키마|schema'],
  ['username', '접속\\s*계정|사용자\\s*(?:이름|명)|username|user|계정'],
  ['password', '세션\\s*비밀번호|비밀번호|패스워드|password|passwd|pwd'],
  ['instance', '인스턴스|instance'], ['tlsMode', 'TLS\\s*(?:요구\\s*수준|모드)?|SSL\\s*모드|sslMode|tlsMode'],
  ['kind', '자료\\s*종류|파일\\s*종류|uploadKind'],
];
const labels = new RegExp(`(?:^|[\\s,;])(?:((?:source|target)[.-]|(?:원천|대상)\\s*(?:DB\\s*)?))?(${aliasGroups.map(([, source]) => `(?:${source})`).join('|')})(?:(?:은|는|이|가|을|를)\\s*|\\s*[:=]\\s*|\\s+)`, 'gi');
const groupMatchers = aliasGroups.map(([name, source]) => [name, new RegExp(`^(?:${source})$`, 'i')]);
const roleOf = value => /^(?:target|대상)/i.test(value) ? 'target' : 'source';
const vendorOf = value => ({ postgres: 'postgresql', postgresql: 'postgresql', pg: 'postgresql', 포스트그레스: 'postgresql', 포스트그레: 'postgresql', oracle: 'oracle', 오라클: 'oracle', mysql: 'mysql', 마이sql: 'mysql', mariadb: 'mariadb', 마리아db: 'mariadb', sqlserver: 'sqlserver', mssql: 'sqlserver', 'sql server': 'sqlserver', 'microsoft sql server': 'sqlserver' })[value.toLowerCase()];
const localRisk = /(?:password|passwd|pwd|secret|token|api[\s_-]*key|비밀번호|패스워드|계정|접속|호스트|스키마|jdbc|Bearer|-----BEGIN)|\bsk-[\w-]+|\b(?:\d{1,3}\.){3}\d{1,3}\b|[A-Za-z]:[\\/]|\\\\|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b\d{6}-[1-4]\d{6}\b|\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b|(?:https?|jdbc):|(?:^|\s)\/[\w.-]+\//i;
const unsupported = /(?:api[\s_-]*key|access[\s_-]*token|refresh[\s_-]*token|private[\s_-]*key|client[\s_-]*secret|jdbc(?:url)?|driverClass|__proto__|constructor|prototype|selector|javascript|shell|sql)\s*[:=]|(?:-----BEGIN|\bBearer\s|\bsk-[\w-]+)/i;
// General screen chat is not a source-review channel. Obvious pasted material
// must use the separately approved artifact/excerpt preview flow.
const sourceMaterial = /```|\bselect\s+[A-Za-z0-9_.*\[\]"`,\s]+\sfrom\s+[A-Za-z_\["`]|\b(?:insert\s+into|delete\s+from|create\s+(?:table|view|index)|alter\s+table|drop\s+(?:table|view))\s+[A-Za-z_\["`]|\bupdate\s+[A-Za-z_][\w.]*\s+set\s|<\/?[A-Za-z][\w:.-]*(?:\s[^<>]*|\s*\/)?>|(?:^|\n)\s*(?:(?:public\s+|private\s+|protected\s+)?(?:class|interface|enum)\s+\w+|(?:const|let|var)\s+\w+\s*=|function\s+\w+\s*\(|def\s+\w+\s*\(|at\s+[\w.$]+\([^\n]*:\d+\))|^\s*[\[{][\s\S]*["'][\w.-]+["']\s*:|(?:^|\n)[^\n,]+,[^\n,]+\r?\n\d+,[^\n]+/im;
export const containsSourceMaterial = value => typeof value === 'string' && sourceMaterial.test(value);

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
  return value;
}
function cleanValue(raw, name, assignment = false) {
  let value = raw.trim().replace(/[,;]+\s*$/, '').trim();
  if (/^["']/.test(value)) return unquote(value);
  // Never alter a password's characters to interpret Korean grammar.
  if (name !== 'password' && !assignment) value = value.replace(/(?:으로|로)?\s*(?:설정해(?:줘|주세요)?|입력해(?:줘|주세요)?|바꿔(?:줘|주세요)?|변경해(?:줘|주세요)?|해줘|해주세요)\s*[.!]?$/, '').replace(/(?:이고요|이고|입니다|이에요|예요|이야|야|요)\s*[.!]?$/, '').trim();
  return value;
}
function normalize(name, raw) {
  const value = String(raw);
  if (name === 'vendor') return vendorOf(value) ?? value.toLowerCase();
  if (name === 'oracleMode') return /^(?:service|서비스(?:\s*이름)?)$/i.test(value) ? 'service' : /^sid$/i.test(value) ? 'sid' : value;
  if (name === 'tlsMode') return ({ '인증서 확인': 'verify-full', '인증서·호스트 확인': 'verify-full', '암호화 필요': 'require', '사용 안 함': 'disable', '사용 안함': 'disable', '사용안함': 'disable', 끔: 'disable' })[value] ?? value.toLowerCase();
  return value;
}
function assignments(message) {
  const quoteAt = new Set(); let quote;
  for (let i = 0; i < message.length; i++) {
    if (quote) { quoteAt.add(i); if (message[i] === quote) quote = undefined; }
    else if (message[i] === '"' || message[i] === "'") quote = message[i];
  }
  const matches = [...message.matchAll(labels)].filter(match => !quoteAt.has(match.index));
  return matches.map((match, index) => {
    const name = groupMatchers.find(([, matcher]) => matcher.test(match[2]))[0];
    const raw = message.slice(match.index + match[0].length, matches[index + 1]?.index ?? message.length);
    return { name, value: normalize(name, cleanValue(raw, name, /[:=]\s*$/.test(match[0]))), ...(match[1] ? { role: roleOf(match[1]) } : {}) };
  });
}
const safeResult = (reply, extra = {}) => ({ handled: true, reply, patches: [], displayMessage: '로컬 설정 도움 요청', ...extra });
function question(fieldId, patches = []) {
  return safeResult(`${fields.get(fieldId).label}을 알려 주세요. 입력값은 외부 AI에 보내지 않고 화면 초안에만 사용합니다.`, {
    patches, navigate: fields.get(fieldId).route, pending: { fieldId }, displayMessage: patches.length ? `설정 항목 ${patches.length}개 입력` : '필요한 설정 항목 안내 요청',
  });
}
function nextField(role, values) {
  return ['vendor', 'host', 'port', 'database', 'schema', 'username'].map(name => `${role}-${name}`).find(id => !values[id]);
}
function fileChoice(text) {
  const kind = /ddl|\.sql\b|스키마/i.test(text) ? 'ddl' : 'zip';
  return safeResult('자료 종류를 선택할 초안을 준비했습니다. 브라우저 보안상 파일은 소스·스키마 자료 화면에서 직접 선택해야 합니다. 경로와 파일 내용은 외부 AI에 보내지 않습니다.', {
    patches: [{ fieldId: 'source-upload-kind', value: kind }], navigate: 'source', displayMessage: '소스·스키마 파일 가져오기 요청',
  });
}
function fieldExplanation(text) {
  const explanations = [
    [/스키마|schema/i, '스키마는 DB 안에서 테이블을 묶는 이름입니다. DB 연결 준비 화면의 ‘분석·검증 스키마’에 실제 이름을 입력하세요. PostgreSQL은 public, SQL Server는 dbo를 쓰는 경우가 있지만 현재 DB의 값을 확인해야 합니다.'],
    [/호스트|host|주소/i, '호스트에는 DB 서버의 이름 또는 주소를 입력합니다. DB 관리자에게 확인하거나 기존 애플리케이션의 연결 설정을 로컬에서 확인하세요. 웹사이트 주소나 JDBC URL 전체를 넣는 칸은 아닙니다.'],
    [/포트|port/i, '포트는 DB 서버가 연결을 받는 번호입니다. DBMS별 기본값이 화면에 있지만 실제 서버 설정과 다를 수 있으므로 DB 관리자에게 확인하세요.'],
    [/비밀번호|password|passwd/i, '세션 비밀번호에는 DB 접속 계정의 비밀번호를 입력합니다. 로컬 폼에서만 처리하며 외부 AI 문맥과 대화 기록에 넣지 않습니다.'],
    [/계정|username/i, '접속 계정에는 DB 사용자의 계정명을 입력합니다. 원천 DB에는 필요한 자료를 읽을 수 있는 계정을 사용하세요.'],
    [/TLS|SSL/i, 'TLS는 DB 연결의 암호화와 인증서 확인 수준입니다. ‘인증서·호스트 확인’이 기본이며 서버의 인증서와 연결 정책을 확인한 뒤 선택하세요.'],
  ];
  return explanations.find(([pattern]) => pattern.test(text))?.[1];
}

/** Raw values and pending entries must stay in caller's volatile local memory, never a model request. */
export function parseChatDraft({ message, pending, values = {}, route } = {}) {
  if (typeof message !== 'string' || message.length > 4000 || !message.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(message)) return safeResult('입력 내용을 확인해 주세요. 한 번에 4,000자까지 입력할 수 있습니다.', { blocked: true });
  const text = message.trim();
  if (containsSourceMaterial(text)) return safeResult('소스 코드·SQL·자료 원문은 일반 대화로 보내지 않습니다. 자료를 등록한 뒤 AI 도우미의 기관 승인과 전송 미리보기에서 검토할 범위를 선택해 주세요.', { blocked: true, navigate: 'ai', displayMessage: '자료 원문 검토 경로 안내 요청' });
  if (unsupported.test(text)) return safeResult('이 내용은 외부 AI에 보내지 않았습니다. DB 연결 항목만 입력할 수 있으며, AI 인증 키는 AI 연결 화면에서 설정해 주세요.', { blocked: true });
  if (/^(?:취소|그만|cancel)$/i.test(text)) return safeResult('추가 질문을 취소했습니다. 이미 입력된 화면 값은 유지합니다.');
  if (/[?？]|어떻게|무엇|무슨|뭐|어디|왜|설명/.test(text) && !/[:=]/.test(text)) {
    const explanation = fieldExplanation(text);
    if (explanation) return safeResult(explanation, { navigate: 'connect', displayMessage: 'DB 입력 항목 설명 요청', ...(pending ? { pending } : {}) });
  }
  if (/zip|압축|ddl|스키마\s*(?:파일|가져|자료)/i.test(text) && /파일|가져|올려|업로드|등록/i.test(text) && !/(?:host|port|database|호스트|포트)\s*[:=]/i.test(text)) return fileChoice(text);
  const explicitRoles = new Set([...text.matchAll(/\b(source|target)\b|원천|대상/gi)].map(match => roleOf(match[0])));
  let entries = assignments(text);
  const previousRole = fields.get(pending?.fieldId)?.route === 'connect' ? pending.fieldId.split('-')[0] : undefined;
  const chosenRole = explicitRoles.size === 1 ? [...explicitRoles][0] : explicitRoles.size === 0 ? previousRole : undefined;
  if (chosenRole && /^(?:원천|대상)\s*(?:DB\s*)?연결(?:을|\s)*(?:설정|준비|시작|도와)/i.test(text)) return question(nextField(chosenRole, values) ?? `${chosenRole}-host`);
  if (pending?.chooseRole && !entries.length && chosenRole && /^(?:원천|대상)(?:\s*DB)?(?:이야|야|요|입니다|이에요)?[.!]?$|^(?:source|target)$/i.test(text)) entries = pending.entries.map(entry => ({ ...entry, role: chosenRole }));
  if (!entries.length && !/[:=]/.test(text) && /(?:저장|실행|분석|삭제|적재|업로드|되돌려).*(?:해줘|해주세요|해요|하세요)|^(?:저장|실행|적재|삭제)$/i.test(text)) return safeResult('대화에서는 화면 입력 초안만 준비합니다. 저장·분석·실행은 해당 화면의 버튼과 확인 절차로 진행해 주세요.', { ...(pending ? { pending } : {}) });
  if (pending?.directOnly && fields.get(pending.fieldId)?.type === 'password' && !entries.length) return safeResult('이 답변은 외부 AI에 보내거나 비밀번호로 자동 입력하지 않았습니다. 비밀번호는 DB 연결 화면의 전용 칸에 직접 입력해 주세요.', { blocked: true, navigate: 'connect', displayMessage: '비밀번호 전용 입력 안내' });
  if (pending?.fieldId && fields.has(pending.fieldId) && !entries.length && !/[?？]|어떻게|왜|뭐|무엇|설명|도움|어디|보여|열어|이동|찾아/.test(text)) {
    const name = pending.fieldId === 'source-path' ? 'path' : pending.fieldId === 'source-upload-kind' ? 'kind' : pending.fieldId.split('-').slice(1).join('-');
    entries = [{ name, value: normalize(name, cleanValue(text, name)), role: pending.fieldId.split('-')[0] }];
  }
  if (!entries.length && chosenRole) {
    const vendor = [...text.matchAll(/PostgreSQL|Postgres|Oracle|오라클|MySQL|MariaDB|SQL\s*Server|MSSQL/gi)].map(match => vendorOf(match[0]));
    if (vendor.length === 1) entries = [{ name: 'vendor', value: vendor[0], role: chosenRole }];
    else if (/설정|연결|준비|시작|등록/.test(text)) return question(nextField(chosenRole, values) ?? `${chosenRole}-host`);
  }
  if (entries.length) {
    const connection = entries.filter(entry => !['path', 'kind'].includes(entry.name));
    if (connection.some(entry => !entry.role) && !chosenRole) return safeResult('원천 DB와 대상 DB 중 어느 쪽 설정인가요? 원천 또는 대상으로 답해 주세요.', {
      navigate: 'connect', pending: { chooseRole: true, entries }, displayMessage: 'DB 설정 항목 입력 · 원천/대상 확인 필요',
    });
    const patches = entries.flatMap(entry => {
      const role = entry.role ?? chosenRole;
      if (['oracleService', 'oracleSid'].includes(entry.name)) return [{ fieldId: `${role}-database`, value: entry.value }, { fieldId: `${role}-oracleMode`, value: entry.name === 'oracleService' ? 'service' : 'sid' }];
      return [{ fieldId: entry.name === 'path' ? 'source-path' : entry.name === 'kind' ? 'source-upload-kind' : `${role}-${entry.name}`, value: entry.value }];
    });
    try {
      const checked = validateDraftPatches(patches, { values });
      const after = { ...values, ...Object.fromEntries(checked.map(patch => [patch.fieldId, patch.value])) };
      const activeRole = chosenRole ?? connection[0]?.role;
      const missing = activeRole && nextField(activeRole, after);
      const labels = checked.map(patch => fields.get(patch.fieldId).label).join(', ');
      const result = safeResult(`${labels}의 입력 초안을 준비했습니다.${checked.some(patch => patch.fieldId === 'source-upload-kind') ? ' 파일은 자료 화면에서 직접 선택해 주세요.' : ''}`, {
        patches: checked, navigate: fields.get(checked[0].fieldId).route, displayMessage: `${labels} 입력 요청`,
      });
      if (missing) { result.pending = { fieldId: missing }; result.reply += ` 다음으로 ${fields.get(missing).label}을 알려 주세요.`; }
      return result;
    } catch (error) {
      return safeResult(error.code === 'CHAT_VENDOR_MISMATCH' ? '해당 항목은 선택한 DBMS에 맞지 않습니다. Oracle 접속 방식은 Oracle에, 인스턴스는 SQL Server에만 사용할 수 있습니다.' : '입력 형식을 확인해 주세요. 포트는 1~65535, 대상 DB는 PostgreSQL이며, 각 항목은 화면에서 지원하는 형식으로 입력해야 합니다.', { blocked: true });
    }
  }
  if (/zip|압축|ddl|스키마\s*(?:파일|가져|자료)/i.test(text)) {
    return fileChoice(text);
  }
  if (/소스.*(?:폴더|경로)|폴더.*(?:등록|분석)/.test(text)) return question('source-path');
  const containsDraftValue = fieldCatalog.some(field => field.sensitive && typeof values[field.id] === 'string' && values[field.id].length >= (field.type === 'password' ? 1 : 3) && text.toLowerCase().includes(values[field.id].toLowerCase()));
  if (localRisk.test(text) || containsDraftValue) return safeResult('접속정보나 로컬 경로가 포함될 수 있어 외부 AI에 보내지 않았습니다. ‘원천 호스트=…’처럼 항목을 지정하거나 해당 설정 화면에서 직접 입력해 주세요.', { blocked: true });
  if (/어디|열어|보여|이동|찾아/.test(text)) {
    const destination = /연결|DB|데이터베이스/i.test(text) ? 'connect' : /소스|스키마|파일/.test(text) ? 'source' : /용어|매핑|변환|원장/.test(text) ? 'review' : /실행|리허설|단계/.test(text) ? 'pipeline' : /결과|산출물|보고서/.test(text) ? 'results' : /로그인|인증|AI/i.test(text) ? 'ai' : undefined;
    if (destination) return safeResult(`${routeCatalog.find(item => item.route === destination).label} 화면에서 확인할 수 있습니다.`, { navigate: destination, displayMessage: '관련 화면 찾기 요청' });
  }
  return { handled: false, reply: '', patches: [], displayMessage: 'AI 질문', ...(routeCatalog.some(item => item.route === route) ? { route } : {}) };
}
