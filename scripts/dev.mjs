#!/usr/bin/env node
/**
 * 개발 서버 통합 기동 진입점 (백엔드 bootRun + 프론트 next dev).
 *
 * [존재 이유] JWT 서명 시크릿의 좌우 비대칭을 구조적으로 막는다.
 *
 * 백엔드(JwtTokenProvider)와 프론트 Proxy(frontend/src/proxy.ts)는 **같은 시크릿**으로
 * 서명·검증해야 한다. 그런데 둘은 서로 다른 프로세스라 각자 환경변수를 따로 해석하고,
 * 어느 한쪽만 루트 .env 를 받으면 서명 검증이 전량 실패한다. 그 실패는 조용하다 —
 * 로그인 API 는 200 을 주고(백엔드 담당), 그 다음 페이지 진입에서 미들웨어가 307 로 /login 에
 * 되돌려보내므로 "인증 완료 후 다시 로그인창" 이라는 무한 루프로만 드러난다. (2026-07-19 실제 발생)
 *
 * 이 스크립트는 두 자식 프로세스를 **하나의 환경**에서 낳아 그 비대칭을 원천 차단한다.
 * package.json 의 dev 스크립트가 `node --env-file-if-exists=.env` 로 이 파일을 실행하므로,
 * 루트 .env 가 있으면 그 값이, 없으면 양쪽 다 각자의 dev 기본값이 쓰인다 — 어느 쪽이든 대칭이다.
 *
 * ⚠ 백엔드만 / 프론트만 따로 띄우는 경우(npm run backend, npm run frontend)는 이 보장이 없다.
 *   한쪽만 .env 가 실린 셸에서 띄우면 비대칭이 재발한다. 그 경우를 위해 양쪽 모두 기동 시
 *   시크릿 지문(SHA-256 앞 8자)을 로그로 남기므로, 두 로그의 지문을 눈으로 대조하면 즉시 판별된다.
 *
 * [원격 DB 보호] 루트 .env 의 DB_URL 이 공유 DB 를 가리키면, 백엔드가 기동하는 순간 Flyway 가
 * 작업 브랜치의 미병합 마이그레이션을 그 DB 에 적용한다 — 스키마 변경 승인과 공유 DB 적용 절차
 * (docs/04-operations/shared-oci-migration-apply-log.md)를 건너뛴다. 그래서 DB_URL 이 로컬 주소가
 * 아니면(판정할 수 없어도) Flyway 를 끄고 띄운다. 일부러 적용하려면 DEV_REMOTE_FLYWAY=migrate 를
 * 준다 — 그때도 개발 시드(db/seed-dev: 알려진 개발 자격)는 넣지 않는다.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/** DB_URL 의 호스트가 이 기계인지 판정한다. 비어 있으면 application.yml 기본값(localhost)이 쓰인다. */
export function isLocalDatabaseUrl(dbUrl) {
  if (!dbUrl) return true;
  const match = /^jdbc:[a-z0-9]+:\/\/(\[[^\]]+\]|[^/:?;]+)/i.exec(dbUrl.trim());
  if (!match) return false;
  return LOCAL_DB_HOSTS.has(match[1].replace(/^\[|\]$/g, '').toLowerCase());
}

/** 백엔드가 접속할 수 있는 DB 주소들 — application.yml 의 DB_URL 과, 그것을 덮어쓰는 Spring 환경 변수. */
const DATABASE_URL_KEYS = ['DB_URL', 'SPRING_DATASOURCE_URL', 'SPRING_DATASOURCE_JDBC_URL', 'SPRING_FLYWAY_URL'];

/** 백엔드 자식 프로세스에 넘길 환경. 원격 DB 면 Flyway 를 끄고(옵트인 시 seed-dev 만 뺀다) 그 사유를 돌려준다. */
export function backendEnvironment(env) {
  if (DATABASE_URL_KEYS.every((key) => isLocalDatabaseUrl(env[key]))) return { env, notice: null };
  if (env.DEV_REMOTE_FLYWAY === 'migrate') {
    return {
      env: { ...env, SPRING_FLYWAY_LOCATIONS: 'classpath:db/migration' },
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

function main() {
  // 기동 시점에 시크릿 지문을 찍어 둔다. 값 자체는 절대 출력하지 않는다(지문만으로 대조에 충분).
  const secret = process.env.JWT_SECRET;
  const fingerprint = secret ? createHash('sha256').update(secret).digest('hex').slice(0, 8) : null;
  console.log(
    fingerprint
      ? `[dev] JWT_SECRET 주입됨 (지문 ${fingerprint}) — 백엔드/프론트 양쪽에 동일하게 전달합니다.`
      : '[dev] JWT_SECRET 미설정 — 백엔드/프론트 양쪽이 각자의 dev 기본값을 씁니다(값이 같으므로 대칭).'
  );
  const backend = backendEnvironment(process.env);
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
    '"pnpm -C frontend dev"';

  // 프런트도 같은 환경을 받는다 — Flyway 키는 Spring 만 읽으므로 JWT_SECRET 대칭은 그대로다.
  const child = spawn(command, { stdio: 'inherit', shell: true, cwd: repoRoot, env: backend.env });

  child.on('exit', (code) => process.exit(code ?? 0));
}

// 시험이 판정 함수만 불러갈 때는 서버를 띄우지 않는다.
if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) main();
