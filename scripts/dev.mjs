#!/usr/bin/env node
/**
 * 개발 서버 통합 기동 진입점 (백엔드 bootRun + 프론트 next dev).
 *
 * [존재 이유] 두 자식 프로세스를 **하나의 환경**에서 낳아 서명·검증 키 설정의 좌우 비대칭을 막는다.
 *
 * 백엔드(JwtTokenProvider)는 ES256 개인키로 서명하고 프론트 Proxy(frontend/src/proxy.ts)는 공개키로 검증한다
 * (ADR-0060). 한쪽만 루트 .env 의 키링을 받으면 서명 검증이 전량 실패하고, 그 실패는 "인증 완료 후 다시 로그인창"
 * 이라는 무음 루프로만 드러난다(2026-07-19 실제 발생). package.json 의 dev 스크립트가
 * `node --env-file-if-exists=.env` 로 이 파일을 실행하므로, 루트 .env 가 있으면 그 키링이, 없으면 양쪽 다
 * 저장소의 개발용 키쌍이 쓰인다. 프론트 자식은 개인키를 상속하지 않는다(frontendEnvironment). 양쪽 모두 기동 시
 * 공개키 지문(SHA-256 앞 8자)을 로그로 남기므로, 따로 띄웠을 때는 두 로그의 지문을 대조한다.
 *
 * [루프백 바인딩] 키링 없이 띄운 백엔드는 공개 저장소의 개발용 서명키를 쓰므로, 네트워크로 닿는 사람은 누구나 토큰을
 * 만들 수 있다. 그래서 bootRun 은 SERVER_ADDRESS 를 주지 않으면 127.0.0.1 에만 바인딩하고(api-server/build.gradle),
 * 백엔드도 키링 없이 루프백이 아닌 주소에 바인딩하면 기동을 멈춘다(ADR-0060 2차).
 *
 * [원격 DB 보호] 루트 .env 의 DB_URL 이 공유 DB 를 가리키면, 백엔드가 기동하는 순간 Flyway 가
 * 작업 브랜치의 미병합 마이그레이션을 그 DB 에 적용한다 — 스키마 변경 승인과 공유 DB 적용 절차
 * (docs/04-operations/shared-oci-migration-apply-log.md)를 건너뛴다. 그래서 DB_URL 이 로컬 주소가
 * 아니면(판정할 수 없어도) Flyway 를 끄고 띄운다. 일부러 적용하려면 DEV_REMOTE_FLYWAY=migrate 를
 * 준다 — 그때도 개발 시드(db/seed-dev: 알려진 개발 자격)는 넣지 않는다.
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** DB_URL 의 호스트가 이 기계인지 판정한다. 비어 있으면 application.yml 기본값(localhost)이 쓰인다. */
export function isLocalDatabaseUrl(dbUrl) {
  if (!dbUrl) return true;
  // Oracle thin 은 jdbc:oracle:thin:@//호스트 꼴이다. 주소를 여러 개 적으면 드라이버가 뒤 호스트로도 붙으므로 모두 이 기계여야 한다.
  const addresses = /^jdbc:(?:oracle:thin:@|[a-z0-9]+:)\/\/([^/?;]+)/i.exec(dbUrl.trim())?.[1];
  if (!addresses) return false;
  return addresses.split(',').every((address) => {
    const host = /^(\[[^\]]+\]|[^:]+)/.exec(address.trim())?.[1];
    return host !== undefined && LOCAL_DB_HOSTS.has(host.replace(/^\[|\]$/g, '').toLowerCase());
  });
}

/** 백엔드가 접속할 수 있는 DB 주소들 — application.yml 의 DB_URL 과, 그것을 덮어쓰는 Spring 환경 변수. */
const DATABASE_URL_KEYS = ['DB_URL', 'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_JDBC_URL', 'SPRING_FLYWAY_URL'];

/**
 * Next 프로세스에 넘기지 않는 서명 비밀 — ES256 개인키 키링과, ADR-0060 2차로 퇴역한 1차 배포의 HMAC 비밀·수용 스위치.
 * 셸이나 루트 .env 에 남아 있어도 Next 가 서명 비밀을 갖지 않게 한다(2026-11-25 Codex 검토).
 * scripts/verify.mjs 가 같은 목록의 사본을 둔다(독립 이관 제품이 그 파일만 복사한다) — dev-remote-db-guard 시험이 대조한다.
 */
export const FRONTEND_WITHHELD_SIGNING_ENV = Object.freeze([
  'JWT_SIGNING_ACTIVE_KID', 'JWT_SIGNING_KEYS_JSON', 'JWT_SECRET', 'JWT_ACCEPT_LEGACY_HMAC',
]);

/** 프런트엔드(Next) 프로세스는 서명 비밀을 상속하지 않고 공개 검증키(JWT_VERIFY_KEYS_JSON)만 받는다(ADR-0060). */
export function frontendEnvironment(env) {
  const cleanEnv = { ...env };
  for (const name of FRONTEND_WITHHELD_SIGNING_ENV) delete cleanEnv[name];
  return cleanEnv;
}

/** 백엔드 자식 프로세스에 넘길 환경. 원격 DB 면 Flyway 를 끄고(옵트인 시 seed-dev 만 뺀다) 그 사유를 돌려준다. */
export function backendEnvironment(env, { flywayLocation = 'classpath:db/migration' } = {}) {
  if (DATABASE_URL_KEYS.every((key) => isLocalDatabaseUrl(env[key]))) return { env, notice: null };
  if (env.DEV_REMOTE_FLYWAY === 'migrate') {
    return {
      env: { ...env, SPRING_FLYWAY_LOCATIONS: flywayLocation },
      notice: '[dev] ⚠ 원격 DB 에 Flyway 를 적용합니다(DEV_REMOTE_FLYWAY=migrate) — 개발 시드(db/seed-dev)는 넣지 않습니다.',
    };
  }
  return {
    env: { ...env, SPRING_FLYWAY_ENABLED: 'false' },
    notice:
      '[dev] ⚠ DB_URL 이 로컬 주소가 아닙니다 — Flyway 자동 적용을 끄고 기동합니다. 엔티티가 쓰는 표·컬럼이 아직 없으면 스키마 검증에서 멈춥니다. ' +
      '공유 DB 적용은 docs/04-operations/shared-oci-migration-apply-log.md 절차를 따르고, 일부러 적용할 때만 DEV_REMOTE_FLYWAY=migrate 를 줍니다.',
  };
}

/** 벤더 생성물은 번역한 기준선 폴더만 Flyway 에 준다. 그 안의 PostgreSQL 번들은 대조용이다. */
export function projectFlywayLocation(root) {
  const lock = join(root, 'reusable-base-lock.json');
  const location = existsSync(lock) ? JSON.parse(readFileSync(lock, 'utf8')).vendorProjection?.location : undefined;
  return location ?? 'classpath:db/migration';
}

function main() {
  // 키링 주입 여부만 알린다. 키 값은 출력하지 않는다(공개키 지문은 백엔드·프런트가 각자 기동 로그에 남긴다).
  console.log(process.env.JWT_SIGNING_KEYS_JSON
    ? '[dev] JWT 서명 키링 주입됨 — 백엔드는 개인키, 프런트는 JWT_VERIFY_KEYS_JSON 의 공개키를 씁니다.'
    : '[dev] JWT 서명 키링 미설정 — 백엔드·프런트가 저장소의 개발용 키쌍을 씁니다(백엔드는 루프백에만 바인딩).');
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const backend = backendEnvironment(process.env, { flywayLocation: projectFlywayLocation(root) });
  if (backend.notice) console.log(backend.notice);

  // ⚠ shell:true 에서는 인자 배열이 하나의 셸 문자열로 합쳐지므로, 배열 원소로 넘긴 명령의
  //   따옴표가 사라진다. 그러면 concurrently 가 "gradlew.bat :api-server:bootRun ..." 을
  //   토큰마다 별개 명령으로 해석해 전부 실패한다. 따옴표를 포함한 단일 문자열로 넘긴다.
  // gradlew 는 절대경로로 부른다. 셸에 따라 현재 디렉터리가 실행 경로 탐색에서 빠져 있으면
  // (Windows 의 NoDefaultCurrentDirectoryInExePath=1 등) 'gradlew.bat' 만으로는 못 찾는다.
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const gradlew = join(repoRoot, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');

  const command =
    'npx -y concurrently -n "API,WEB" -c "blue,green" ' +
    `"\\"${gradlew}\\" :api-server:bootRun -Dfile.encoding=UTF-8" ` +
    `"\\"${process.execPath}\\" scripts/dev.mjs --web-child"`;

  // 프런트 자식(--web-child)은 frontendEnvironment()로 서명 비밀을 제거한 뒤 pnpm -C frontend dev 를 띄운다.
  // 프런트만 띄우는 `npm run frontend` 도 같은 --web-child 진입점을 쓴다(package.json).
  const child = spawn(command, { stdio: 'inherit', shell: true, cwd: repoRoot, env: backend.env });

  child.on('exit', (code) => process.exit(code ?? 0));
}

function runWebChild() {
  const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(pnpm, ['-C', 'frontend', 'dev'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: frontendEnvironment(process.env),
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

// 시험이 판정 함수만 불러갈 때는 서버를 띄우지 않는다.
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  if (process.argv.includes('--web-child')) runWebChild();
  else main();
}
