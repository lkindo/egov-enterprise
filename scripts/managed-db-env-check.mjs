#!/usr/bin/env node
/**
 * 외부 관리형 DB 배포 전 접속 변수 검사(Wave 4, docker-compose.managed-db.yml).
 *
 * DB_URL 은 번들 DB(db:5432)·루프백이 아닌 PostgreSQL 주소여야 하고, 서버 인증서를 검증해야 한다(sslmode=verify-full 과
 * /app/certs/db/ 아래 sslrootcert). 드라이버의 클래스 이름을 받는 옵션(sslfactory·socketFactory 등)은 허용 목록 밖이라 거부한다 —
 * URL 하나로 임의 클래스를 앱에 싣지 않게 한다. 값은 출력하지 않는다(이름과 이유만).
 *
 *   node scripts/managed-db-env-check.mjs        # 현재 환경 변수를 검사한다. 문제가 있으면 1
 */
import { pathToFileURL } from 'node:url';

const ALLOWED_PARAMETERS = new Set([
  'sslmode', 'sslrootcert', 'currentSchema', 'prepareThreshold', 'connectTimeout', 'socketTimeout',
  'ApplicationName', 'targetServerType',
]);
const LOCAL_HOSTS = new Set(['db', 'localhost', '127.0.0.1', '::1', '[::1]']);
const REQUIRED = ['DB_URL', 'DB_USERNAME', 'DB_PASSWORD', 'DB_SSL_CA_DIR'];

/** 문제 목록(빈 배열이면 통과). 값은 담지 않는다. */
export function evaluateManagedDbEnvironment(env) {
  const problems = [];
  for (const name of REQUIRED) {
    if (!env[name] || !String(env[name]).trim()) problems.push(`${name} 가 비어 있습니다.`);
  }
  const url = env.DB_URL ? String(env.DB_URL).trim() : '';
  if (!url) return problems;
  const match = /^jdbc:postgresql:\/\/(\[[0-9a-fA-F:]+\]|[A-Za-z0-9.-]+)(?::(\d{1,5}))?\/([A-Za-z0-9_]+)(?:\?(.*))?$/.exec(url);
  if (!match) {
    problems.push('DB_URL 은 jdbc:postgresql://<host>[:port]/<db>?<옵션> 형식이어야 합니다.');
    return problems;
  }
  const [, host, port, , query = ''] = match;
  if (LOCAL_HOSTS.has(host.toLowerCase())) {
    problems.push('DB_URL 이 번들 DB·루프백을 가리킵니다 — 관리형 DB 오버레이에서는 외부 DB 주소를 씁니다.');
  }
  if (port !== undefined && (Number(port) < 1 || Number(port) > 65535)) problems.push('DB_URL 의 포트가 범위를 벗어났습니다.');
  const parameters = new Map();
  for (const pair of query.split('&').filter(Boolean)) {
    const separator = pair.indexOf('=');
    const rawName = separator < 0 ? pair : pair.slice(0, separator);
    // 드라이버는 옵션 이름을 디코딩하지 않는다 — 인코딩한 이름(%73slmode)은 검사기와 드라이버가 다르게 읽으므로 받지 않는다.
    if (rawName.includes('%')) problems.push(`DB_URL 옵션 이름은 인코딩할 수 없습니다(${rawName.replace(/%/g, '%%').slice(0, 40)}).`);
    const name = rawName;
    const value = separator < 0 ? '' : decodeURIComponent(pair.slice(separator + 1));
    if (parameters.has(name)) problems.push(`DB_URL 옵션 ${name} 이 두 번 있습니다.`);
    parameters.set(name, value);
  }
  for (const name of parameters.keys()) {
    if (!ALLOWED_PARAMETERS.has(name)) problems.push(`DB_URL 옵션 ${name} 은 허용 목록 밖입니다.`);
  }
  if (parameters.get('sslmode') !== 'verify-full') {
    problems.push('DB_URL 은 sslmode=verify-full 이어야 합니다 — 서버 인증서와 호스트 이름을 검증합니다.');
  }
  const rootCert = parameters.get('sslrootcert') ?? '';
  if (!/^\/app\/certs\/db\/[A-Za-z0-9._-]+$/.test(rootCert) || rootCert.includes('..')) {
    problems.push('DB_URL 의 sslrootcert 는 /app/certs/db/<파일> 이어야 합니다(DB_SSL_CA_DIR 을 읽기 전용으로 붙인 자리).');
  }
  return problems;
}

/** 오버레이 원문이 번들 DB 를 빼고 api 의 db 대기를 지우며 CA 를 읽기 전용으로 붙이는가. */
export function evaluateManagedDbOverlay(source) {
  const problems = [];
  if (!/^ {2}db:\n {4}profiles: \["bundled-db"\]/m.test(source)) problems.push('db 서비스를 bundled-db 프로필로 빼야 합니다.');
  if (!/^ {4}depends_on: !reset \{\}/m.test(source)) problems.push('api 의 depends_on 을 !reset 으로 지워야 합니다.');
  if (!/\$\{DB_SSL_CA_DIR:\?[^}]*\}:\/app\/certs\/db:ro/.test(source)) problems.push('CA 디렉터리를 /app/certs/db 에 읽기 전용으로 붙여야 합니다.');
  // 주석은 안내 문장이라 보지 않는다(YAML 은 # 만 주석이다).
  const code = source.split('\n').filter((line) => !/^\s*#/.test(line)).join('\n');
  if (/TRUSTED_EDGE_PROXY|SPRING_APPLICATION_JSON|POSTGRES_PASSWORD/.test(code)) {
    problems.push('관리형 DB 오버레이는 신뢰 경계·datasource JSON·번들 DB 자격을 다시 정하지 않습니다.');
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problems = evaluateManagedDbEnvironment(process.env);
  if (problems.length > 0) {
    console.error(`managed-db: 배포 전 접속 변수 검사 실패 (${problems.length}건)`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }
  console.log('managed-db: 접속 변수 검사 통과 (값은 출력하지 않는다)');
}
