import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/*
 * 선택 연동(integrates, 설계서 9.1·B4). 'from' 기능은 'to' 기능 없이도 컴파일·기동·DB 생성이 되지만 동작 일부가
 * 조용히 빠진다. 계획은 그런 연동을 '기능 저하'로 알린다. 없으면 실패하는 관계는 requires 이고 여기 두지 않는다.
 *
 * 포함 규칙: from 기능의 동작이 줄어드는 것만 적는다. 빠진 기능 자신의 데이터·진입점만 사라지는 경우(공용 셸의
 * 메뉴·카드, 자기 행만 정리하는 리스너, 등록만 하는 기여자)는 적지 않는다. 화면 결합(shared-ui·ui-import)은
 * Phase 2 슬롯 전까지 requires 로 남고, 연동 종류도 event·port·fk-optional 셋뿐이다.
 *
 * 이벤트 연동의 근거는 손으로 적지 않는다. 카탈로그가 발행·수신 위치를 매번 계산하고(deriveEventTriples),
 * 계산된 연결은 INTEGRATES 또는 REGISTRATION_ONLY_EVENTS 중 정확히 한쪽에 있어야 한다.
 * 포트·선택 FK 연동은 주석을 뺀 코드에서 정확히 한 번 나오는 문자열(anchor)로 근거를 단다.
 * 문장은 평서문으로 쓰고 내부 클래스·경로를 담지 않는다 — 계획 화면에 그대로 나간다.
 */
export const INTEGRATES = [
  { from: 'core', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 부서 업무의 담당자를 지정하거나 바꿔도 새 담당자에게 업무 배정 알림이 가지 않습니다.' },
  { from: 'board', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 다른 사람이 내 게시글에 댓글을 달아도 글쓴이에게 새 댓글 알림이 가지 않습니다.' },
  { from: 'informalsanction', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 결재 순서 도래, 회수, 반려, 보완 요청과 답변, 결재자 변경, 참조자 지정, 최종 결과가 앱 알림으로 전달되지 않습니다. 재알림·결재자 변경·참조자 지정 화면은 알린다고 안내하지만 실제로는 전달되지 않습니다.' },
  { from: 'memoreport', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 메모 보고가 도착하거나, 지시가 달리거나 바뀌거나, 지시가 달린 보고가 삭제되어도 당사자에게 알림이 가지 않습니다. 지시 변경 확인창은 알린다고 안내하지만 실제로는 전달되지 않습니다.' },
  { from: 'note', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 쪽지를 보내도 받는 사람에게 새 쪽지 알림이 가지 않고, 받는 사람은 쪽지함을 직접 열어야 압니다.' },
  { from: 'mail', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 메일 발송이 실패로 확정되어도 보낸 사람에게 실패 알림이 가지 않고, 메일 이력 화면을 직접 열어야 압니다.' },
  { from: 'sms', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 문자 발송 일부가 실패해도 보낸 사람에게 실패 알림이 가지 않고, 문자 화면에서 수신자 결과를 직접 확인해야 합니다.' },
  { from: 'system', to: 'notification', via: 'event:NotificationRequestedEvent',
    reason: '알림 기능이 없으면 커뮤니티 가입 신청이 들어와도 승인 권한자에게 알림이 가지 않고, 승인·반려 결과도 신청자에게 알림으로 전달되지 않습니다.' },
  { from: 'informalsanction', to: 'mail', via: 'event:MailRequestedEvent',
    reason: '메일 기능이 없으면 결재가 최종 승인되거나 반려되어도 신청자에게 결과 메일이 가지 않습니다.' },
  { from: 'informalsanction', to: 'sms', via: 'event:SmsRequestedEvent',
    reason: '문자 기능이 없으면 결재가 최종 승인되거나 반려되어도 신청자에게 결과 문자가 가지 않습니다.' },
  { from: 'mail', to: 'addressbook', via: 'port:RecipientAddressBookSource',
    reason: '주소록 기능이 없으면 메일 작성 화면의 받는 사람 고르기에서 주소록 탭이 사라지고 사용자·부서 검색과 직접 입력만 남습니다.',
    anchors: [{ path: 'frontend/src/app/admin/collaboration/mail-send/MailSendHubClient.tsx', anchor: 'addressBook={recipientAddressBookSource}' },
      { path: 'frontend/src/types/recipient-address-book.ts', anchor: 'export interface RecipientAddressBookSource' }] },
  { from: 'sms', to: 'addressbook', via: 'port:RecipientAddressBookSource',
    reason: '주소록 기능이 없으면 문자 작성 화면의 받는 사람 고르기에서 주소록 탭이 사라지고 사용자·부서 검색과 번호 직접 입력만 남습니다.',
    anchors: [{ path: 'frontend/src/app/admin/uss/ion/sms/SmsAdminClient.tsx', anchor: 'addressBook={recipientAddressBookSource}' },
      { path: 'frontend/src/types/recipient-address-book.ts', anchor: 'export interface RecipientAddressBookSource' }] },
  { from: 'board', to: 'system', via: 'fk-optional:fk_tb_bbs_master_tb_cmnty_info',
    reason: '커뮤니티 기능이 없으면 게시판 생성 마법사에서 커뮤니티 귀속 선택이 사라져 게시판을 커뮤니티 회원 전용으로 만들 수 없습니다.',
    anchors: [{ path: 'api-server/src/main/resources/db/migration/V2_102__add_reference_integrity_fks.sql', anchor: 'ADD CONSTRAINT fk_tb_bbs_master_tb_cmnty_info' }] },
];

/*
 * 계산된 이벤트 연결 가운데 잃는 것이 없는 것. 수신 기능이 자기 행만 정리하므로, 그 기능이 없으면 정리할 행도 없다.
 * 계산과 정확히 맞아야 한다 — 이 목록에만 있고 계산에 없는 행, 두 목록에 모두 있는 행은 카탈로그가 거부한다.
 */
export const REGISTRATION_ONLY_EVENTS = [
  ...['addressbook', 'board', 'comment', 'notification', 'system'].map(to => ({ from: 'core', to, event: 'UserDeletionEvent',
    reason: '사용자를 지울 때 그 사용자의 행을 함께 정리할 뿐이라, 이 기능이 없으면 정리할 행도 없습니다.' })),
];

export const INTEGRATION_KINDS = ['event', 'port', 'fk-optional'];
const SCAN_ROOTS = ['foundation/src/main/java', 'business-core/src/main/java', 'business-app/src/main/java', 'api-server/src/main/java'];
const APP_PREFIX = 'business-app/src/main/java/nuri/business/';
// 받는 타입이 이것이면 어떤 이벤트를 받는지 정할 수 없다. 클래스를 애노테이션에 적어야 한다.
const BROAD_EVENT_TYPES = new Set(['Object', 'ApplicationEvent', 'DomainEvent', 'PayloadApplicationEvent', 'Record']);
const JAVA_IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
// 로캘과 무관한 정렬. 카탈로그 해시가 실행 환경에 따라 달라지지 않게 한다.
const byCodeUnits = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function walk(directory) {
  if (!existsSync(directory)) return [];
  if (!statSync(directory).isDirectory()) return [directory];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(directory, entry.name)) : [join(directory, entry.name)]).sort();
}
const lineAt = (text, index) => text.slice(0, index).split('\n').length;
const simpleName = qualified => qualified.replace(/<[\s\S]*$/u, '').replace(/\[\]/gu, '').split('.').pop();
const TS_STRING_KEYWORDS = /(?:^|[^\w$])(?:return|case|typeof|in|of|yield|await|else|do|throw|new|delete|void|export|import|from|default|extends|as)$/u;

/** TS 에서 따옴표가 문자열을 여는 자리인가. JSX 본문의 아포스트로피(don't)는 문자열이 아니다. */
function opensTsString(source, index) {
  let back = index - 1;
  while (back >= 0 && /[ \t]/u.test(source[back])) back -= 1;
  if (back < 0 || source[back] === '\n' || source[back] === '\r') return true;
  if ('=(,:[{?!&|+-*%<>;~^}'.includes(source[back])) return true;
  return TS_STRING_KEYWORDS.test(source.slice(Math.max(0, back - 10), back + 1));
}

/**
 * 주석을 공백으로 바꾼다(줄·위치 보존). strings=false 면 문자열·문자 리터럴도 지운다.
 * kind: java(텍스트 블록 포함)·ts(템플릿 문자열 포함, 코드 위치의 따옴표만 문자열로 본다)·sql.
 * TS 정규식 리터럴은 해석하지 않는다 — 따옴표가 든 정규식 뒤 같은 줄의 주석은 놓칠 수 있다.
 */
export function stripComments(source, { kind = 'java', strings = true } = {}) {
  const out = source.split('');
  const blank = (from, to) => { for (let i = from; i < to; i += 1) if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' '; };
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if ((kind !== 'sql' && two === '//') || (kind === 'sql' && two === '--')) {
      const end = source.indexOf('\n', i);
      const stop = end < 0 ? source.length : end;
      blank(i, stop); i = stop; continue;
    }
    if (two === '/*') {
      const end = source.indexOf('*/', i + 2);
      const stop = end < 0 ? source.length : end + 2;
      blank(i, stop); i = stop; continue;
    }
    if (kind === 'java' && source.startsWith('"""', i)) {
      let j = i + 3;
      while (j < source.length && !source.startsWith('"""', j)) j += source[j] === '\\' ? 2 : 1;
      const stop = Math.min(j + 3, source.length);
      if (!strings) blank(i, stop);
      i = stop; continue;
    }
    const quote = source[i];
    if ((quote === '"' || quote === "'" || (kind === 'ts' && quote === '`')) && (kind !== 'ts' || opensTsString(source, i))) {
      let j = i + 1;
      while (j < source.length && source[j] !== quote) {
        if (source[j] === '\\' && kind !== 'sql') j += 1;
        else if (quote !== '`' && source[j] === '\n') break;
        j += 1;
      }
      const stop = Math.min(j + 1, source.length);
      if (!strings) blank(i, stop);
      i = stop; continue;
    }
    i += 1;
  }
  return out.join('');
}

function balancedEnd(code, open, [opening, closing] = ['(', ')']) {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === opening) depth += 1;
    else if (code[i] === closing) { depth -= 1; if (depth === 0) return i + 1; }
  }
  return -1;
}
function skipSpace(code, index) { while (index < code.length && /\s/u.test(code[index])) index += 1; return index; }
function skipAnnotation(code, index) {
  const annotation = /^@(?:[\w$]+\.)*[\w$]+/u.exec(code.slice(index));
  let end = index + annotation[0].length;
  const next = skipSpace(code, end);
  if (code[next] === '(') end = balancedEnd(code, next);
  return end;
}
function firstParameterType(parameters) {
  let depth = 0;
  let end = parameters.length;
  for (let i = 0; i < parameters.length; i += 1) {
    if ('<('.includes(parameters[i])) depth += 1;
    else if ('>)'.includes(parameters[i])) depth -= 1;
    else if (parameters[i] === ',' && depth === 0) { end = i; break; }
  }
  const first = parameters.slice(0, end).replace(/@(?:[\w$]+\.)*[\w$]+(?:\s*\([^)]*\))?/gu, ' ').replace(/\bfinal\b/gu, ' ').trim();
  if (!first) return null;
  const tokens = first.replace(/<[\s\S]*>/gu, '').trim().split(/\s+/u);
  return tokens.length >= 2 ? simpleName(tokens[tokens.length - 2]) : null;
}

/**
 * 주석·문자열을 지운 Java 코드에서 이벤트 리스너가 받는 타입과 선언 줄을 찾는다. 해석하지 못하면 실패한다.
 * 애노테이션에 클래스를 적으면 그 클래스만 받는다(Spring 과 같다) — 매개변수는 그 상위 타입일 수 있다.
 */
export function eventListenersIn(code, path = '<source>') {
  const result = [];
  for (const match of code.matchAll(/@(?:[\w$]+\.)*(?:Transactional)?EventListener\b/gu)) {
    const where = `${path}:${lineAt(code, match.index)}`;
    let index = match.index + match[0].length;
    let declared = [];
    const open = skipSpace(code, index);
    if (code[open] === '(') {
      const close = balancedEnd(code, open);
      declared = [...code.slice(open + 1, close - 1).matchAll(/((?:[\w$]+\.)*[\w$]+)\s*\.\s*class\b/gu)].map(found => simpleName(found[1]));
      index = close;
    }
    // 애노테이션·수식어·반환 타입을 토큰 단위로 지나 메서드 이름 뒤의 괄호에 닿는다. 애노테이션 괄호를 매개변수로 읽지 않는다.
    let cursor = index;
    for (;;) {
      cursor = skipSpace(code, cursor);
      if (code[cursor] === '@') { cursor = skipAnnotation(code, cursor); continue; }
      if (code[cursor] === '<') { cursor = balancedEnd(code, cursor, ['<', '>']); continue; }
      if (code[cursor] === '(') break;
      const word = /^[\w$.[\]?]+/u.exec(code.slice(cursor));
      if (!word) throw new Error(`Event listener has no method: ${where}`);
      cursor += word[0].length;
    }
    const parameterType = firstParameterType(code.slice(cursor + 1, balancedEnd(code, cursor) - 1));
    const types = declared.length ? declared : parameterType ? [parameterType] : [];
    if (!types.length) throw new Error(`Event listener type could not be resolved: ${where}`);
    for (const type of types) {
      if (!JAVA_IDENTIFIER.test(type)) throw new Error(`Event listener type could not be resolved: ${where}`);
      result.push({ type, line: lineAt(code, cursor) });
    }
  }
  for (const match of code.matchAll(/\bimplements\b[^{;]*?\bApplicationListener\s*<\s*((?:[\w$]+\.)*[\w$]+)/gu)) {
    result.push({ type: simpleName(match[1]), line: lineAt(code, match.index) });
  }
  return result;
}

/**
 * 이벤트 객체를 만드는 위치. 만드는 것을 발행 의도로 본다(변수에 담아 발행하는 곳도 있다).
 * 생성자·생성자 참조뿐 아니라 그 타입의 정적 호출(빌더·팩토리: T.builder(, T.of()도 센다 — 놓치면 연동이 숨는다.
 * 넓게 세서 생기는 거짓 연결은 '선언되지 않은 연동'으로 드러나 사람이 판정한다.
 */
export function eventConstructionsIn(code, type) {
  if (!JAVA_IDENTIFIER.test(type)) throw new Error(`Event type is not a Java identifier: ${type}`);
  const name = type.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const pattern = new RegExp(`(?:\\bnew\\s+(?:[\\w$]+\\.)*${name}\\s*(?:<[^<>]*>)?\\s*\\(`
    + `|(?<![\\w$])(?:[\\w$]+\\.)*${name}\\s*::\\s*new\\b`
    + `|(?<![\\w$.])(?:[\\w$]+\\.)*${name}\\s*\\.\\s*(?!class\\b)[A-Za-z_$][\\w$]*\\s*\\()`, 'gu');
  return [...code.matchAll(pattern)].map(found => lineAt(code, found.index));
}

/** 직접 선택 폐포(화면 결합 포함). '함께 포함된다'와 '소유가 정해진다'가 같은 관계를 쓴다. */
export function requiresClosure(capabilities) {
  const requires = new Map(capabilities.map(capability => [capability.id, capability.requires.map(edge => edge.domain)]));
  const cache = new Map();
  return from => {
    if (!cache.has(from)) {
      const seen = new Set([from]);
      const queue = [from];
      while (queue.length) for (const next of requires.get(queue.shift()) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
      cache.set(from, seen);
    }
    return cache.get(from);
  };
}

/**
 * 파일 소유 판정. domainSupportFiles 선언이 먼저, 그다음 업무 앱 디렉터리다. foundation·business-core 는 core 다.
 * 그 밖(주로 api-server)은 참조하는 업무 패키지로 정한다 — 생성기는 그 기능이 빠지면 참조 파일을 함께 지운다.
 * 여러 기능을 참조하면 나머지를 모두 끌어오는 기능이 소유자다(그 기능이 있어야 파일이 남는다). 그런 기능이 없으면 실패한다.
 * 같은 패키지의 단순 이름 참조처럼 이 규칙이 못 보는 연쇄 제거는 시험이 생성기 제거 계획과 대조해 잡는다.
 */
export function sourceOwner(supportOwners, domains, closure) {
  const selectable = new Set(domains);
  return (path, code) => {
    if (supportOwners.has(path)) return supportOwners.get(path);
    if (path.startsWith(APP_PREFIX)) return path.slice(APP_PREFIX.length).match(/^(?:domain|service)\/([a-z][a-z0-9_]*)\//u)?.[1] ?? 'core';
    if (/^(?:foundation|business-core)\//u.test(path)) return 'core';
    const referenced = [...new Set([...code.matchAll(/(?<![\w$])nuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./gu)]
      .map(found => found[1]).filter(domain => selectable.has(domain)))].sort(byCodeUnits);
    if (referenced.length <= 1) return referenced[0] ?? 'core';
    const owners = referenced.filter(domain => referenced.every(other => closure(domain).has(other)));
    if (!owners.length) throw new Error(`Event source ownership is ambiguous: ${path} references ${referenced.join(', ')}`);
    return owners[0];
  };
}

/** 리스너와 그 리스너가 받는 이벤트를 만드는 위치를 모두 찾는다(소유가 core 인 것 포함). */
export function deriveEventSources(root, ownerOf) {
  const files = SCAN_ROOTS.flatMap(scanRoot => walk(join(root, scanRoot))).filter(path => path.endsWith('.java'))
    .map(absolute => ({ path: relative(root, absolute).split(sep).join('/'), code: stripComments(readFileSync(absolute, 'utf8'), { strings: false }) }));
  const owners = new Map();
  const owner = file => { if (!owners.has(file.path)) owners.set(file.path, ownerOf(file.path, file.code)); return owners.get(file.path); };
  const listeners = files.flatMap(file => eventListenersIn(file.code, file.path).map(listener => ({ ...listener, path: file.path, owner: owner(file) })));
  const constructions = [];
  for (const type of [...new Set(listeners.filter(listener => listener.owner !== 'core').map(listener => listener.type))].sort(byCodeUnits)) {
    const found = files.flatMap(file => eventConstructionsIn(file.code, type).map(line => ({ path: file.path, line, type, owner: owner(file) })));
    const where = listeners.find(listener => listener.type === type && listener.owner !== 'core');
    if (BROAD_EVENT_TYPES.has(type)) throw new Error(`Event listener type is too broad to tell its events apart: ${where.path}:${where.line} ${type}`);
    // 어떤 방법으로도 만들지 않는 이벤트의 리스너는 불리지 않는다(죽은 리스너). 발행자가 없으니 잃는 것도 없다.
    constructions.push(...found);
  }
  return { listeners, constructions };
}

/**
 * (발행 기능, 수신 기능, 이벤트) 연결을 계산한다. 수신이 core 이면 늘 있으므로, 발행과 수신이 같은 기능이면 연동이 아니므로 뺀다.
 */
export function deriveEventTriples(root, ownerOf, sources = deriveEventSources(root, ownerOf)) {
  const triples = new Map();
  for (const listener of sources.listeners.filter(row => row.owner !== 'core')) {
    for (const publisher of sources.constructions.filter(row => row.type === listener.type)) {
      if (publisher.owner === listener.owner) continue;
      const key = `${publisher.owner}\u0000${listener.owner}\u0000${listener.type}`;
      if (!triples.has(key)) triples.set(key, { from: publisher.owner, to: listener.owner, event: listener.type, publishers: [], listeners: [] });
      const triple = triples.get(key);
      if (!triple.publishers.some(row => row.path === publisher.path && row.line === publisher.line)) triple.publishers.push({ path: publisher.path, line: publisher.line });
      if (!triple.listeners.some(row => row.path === listener.path && row.line === listener.line)) triple.listeners.push({ path: listener.path, line: listener.line });
    }
  }
  return [...triples.values()].sort((a, b) => byCodeUnits(`${a.from}\u0000${a.to}\u0000${a.event}`, `${b.from}\u0000${b.to}\u0000${b.event}`));
}

/**
 * from 이 들어간 어떤 구성에서 to 가 빠질 수 있는가. 이벤트 판정과 '저하될 수 없는 선언' 판정이 같은 술어를 쓴다 —
 * 두 판정이 다르면 선언할 수도 안 할 수도 없는 쌍이 생긴다.
 */
export function degradationPredicate(capabilities, presets) {
  const closure = requiresClosure(capabilities);
  return (from, to) => from === 'core'
    || !(closure(from).has(to) && presets.filter(preset => preset.domains.includes(from)).every(preset => preset.domains.includes(to)));
}

function anchorEvidence(root, { path, anchor }) {
  const absolute = join(root, path);
  const testSource = path.includes('/__tests__/') || /\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(path);
  if (!/^(?:frontend\/src|[a-z-]+\/src\/main)\//u.test(path) || testSource || !existsSync(absolute)) {
    throw new Error(`integration evidence is not a product source: ${path}`);
  }
  const kind = path.endsWith('.sql') ? 'sql' : path.endsWith('.java') ? 'java' : 'ts';
  const code = stripComments(readFileSync(absolute, 'utf8').replace(/\r\n/gu, '\n'), { kind });
  const first = code.indexOf(anchor);
  if (first < 0) throw new Error(`declared integration drifted: ${path} lacks ${anchor}`);
  if (code.indexOf(anchor, first + 1) >= 0) throw new Error(`integration evidence anchor is ambiguous: ${path} ${anchor}`);
  return { path, line: lineAt(code, first), role: 'anchor' };
}

/**
 * 선언을 계산과 대조해 계획에 실을 연동 목록을 만든다. 순수 판정은 triples·canDegrade 를 받아 합성 입력으로 시험한다.
 */
export function resolveIntegrations({ root, declared = INTEGRATES, registrationOnly = REGISTRATION_ONLY_EVENTS, triples, canDegrade, domains, optionalForeignKeys }) {
  const fail = message => { throw new Error(`project-composer catalog: ${message}`); };
  const known = new Set(domains);
  const keys = new Set();
  const rows = [];
  for (const edge of declared) {
    const [kind, target] = String(edge.via ?? '').split(/:(.+)/u);
    if (!INTEGRATION_KINDS.includes(kind) || !target) fail(`unsupported integration kind: ${edge.via}`);
    if (!(edge.from === 'core' || known.has(edge.from)) || !known.has(edge.to) || edge.from === edge.to) fail(`invalid integration endpoints: ${edge.from} -> ${edge.to}`);
    if (typeof edge.reason !== 'string' || !/[가-힣]/u.test(edge.reason) || !edge.reason.endsWith('.')) fail(`integration needs a user sentence: ${edge.from} -> ${edge.to}`);
    const key = `${edge.from}\u0000${edge.to}\u0000${edge.via}`;
    if (keys.has(key)) fail(`duplicate integration: ${edge.from} -> ${edge.to} via ${edge.via}`);
    keys.add(key);
    if (!canDegrade(edge.from, edge.to)) fail(`declared integration can never degrade: ${edge.from} -> ${edge.to}`);
    let evidence;
    if (kind === 'event') {
      if (edge.anchors) fail(`event integration evidence is derived, not declared: ${edge.from} -> ${edge.to}`);
      const triple = triples.find(row => row.from === edge.from && row.to === edge.to && row.event === target);
      if (!triple) fail(`declared event integration has no publisher and listener: ${edge.from} -> ${edge.to} via ${edge.via}`);
      evidence = [...triple.publishers.map(row => ({ ...row, role: 'publisher' })), ...triple.listeners.map(row => ({ ...row, role: 'listener' }))];
    } else {
      if (!Array.isArray(edge.anchors) || !edge.anchors.length) fail(`integration needs evidence anchors: ${edge.from} -> ${edge.to}`);
      evidence = edge.anchors.map(anchor => anchorEvidence(root, anchor));
    }
    if (kind === 'fk-optional') {
      const fk = optionalForeignKeys.find(row => row.name === target);
      if (!fk || fk.sourceDomain !== edge.from || fk.targetDomain !== edge.to) fail(`fk-optional integration does not match an optional foreign key: ${target}`);
    }
    rows.push({ from: edge.from, to: edge.to, via: edge.via, reason: edge.reason,
      evidence: evidence.sort((a, b) => byCodeUnits(`${a.path}:${String(a.line).padStart(6, '0')}`, `${b.path}:${String(b.line).padStart(6, '0')}`)) });
  }
  for (const fk of optionalForeignKeys) {
    if (rows.filter(row => row.via === `fk-optional:${fk.name}`).length !== 1) fail(`optional foreign key lacks its integration: ${fk.name}`);
  }
  const registrationKeys = new Set();
  for (const row of registrationOnly) {
    const key = `${row.from}\u0000${row.to}\u0000${row.event}`;
    if (registrationKeys.has(key)) fail(`duplicate registration-only event: ${row.from} -> ${row.to} via ${row.event}`);
    registrationKeys.add(key);
    if (!triples.some(triple => triple.from === row.from && triple.to === row.to && triple.event === row.event)) {
      fail(`registration-only event has no publisher and listener: ${row.from} -> ${row.to} via ${row.event}`);
    }
    if (!canDegrade(row.from, row.to)) fail(`registration-only event can never degrade: ${row.from} -> ${row.to}`);
  }
  for (const triple of triples) {
    const declaredHere = keys.has(`${triple.from}\u0000${triple.to}\u0000event:${triple.event}`);
    const registered = registrationKeys.has(`${triple.from}\u0000${triple.to}\u0000${triple.event}`);
    if (declaredHere && registered) fail(`event classified twice: ${triple.from} -> ${triple.to} via ${triple.event}`);
    if (!canDegrade(triple.from, triple.to)) continue;
    if (!declaredHere && !registered) fail(`undeclared integration: ${triple.from} -> ${triple.to} via event:${triple.event}`);
  }
  return rows.sort((a, b) => byCodeUnits(`${a.from}\u0000${a.to}\u0000${a.via}`, `${b.from}\u0000${b.to}\u0000${b.via}`));
}
