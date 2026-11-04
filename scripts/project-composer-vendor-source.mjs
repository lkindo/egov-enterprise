/**
 * 벤더별 소스 값(ADR-0047 D-11). 값만 둔다 — 인증 원장 판정(project-composer-vendors.mjs)이 투영 유무를 보는데,
 * 투영 코드는 그 판정 모듈의 어댑터를 가져오므로 값을 나눠야 순환이 생기지 않는다.
 * 드라이버 판은 이관 도구와 같다. MariaDB 만 다르다 — 이관 도구는 실측한 3.5.10 을 시험이 정확히 단언해 재실측 전에는 올리지 않고(.github/dependabot.yml),
 * 생성물은 실행 의존성이라 3.5.10 의 보안 권고가 고쳐진 3.5.11 을 쓴다.
 */

/**
 * MySQL 계열의 접속 인자. 세션 시간대를 한국 벽시계로 두어 NOW()·CURRENT_DATE 가 시간대 표 없이 한국 날짜가 되고, 연결 콜레이션을 표와 같은 이진 콜레이션으로 둔다
 * (2026-11-04 MySQL 8.4·MariaDB 11.4 실측). '+' 는 Connector/J 에 %2B 로, MariaDB 드라이버에 그대로 준 형태를 쟀다 — 드라이버마다 URL 해독이 달라 서로 바꿔 쓰지 않는다.
 * 생성물 접속 주소와 통합 시험 주소가 같은 값을 쓴다.
 * MySQL 만 세션의 행 잠금 대기를 앱의 잠금 조회 상한(jakarta.persistence.lock.timeout 5초)과 같게 묶는다. Hibernate 의 MySQL 방언은 잠금 조회에 대기 시간을
 * 싣지 못해 기본 50초를 기다렸다(2026-11-04 통합 시험). MariaDB 는 방언이 FOR UPDATE WAIT 를 써서 따로 두지 않는다. 계약 시험이 두 값을 대조한다.
 */
const MYSQL_URL_PARAMETERS = "sessionVariables=time_zone='%2B09:00',innodb_lock_wait_timeout=5&connectionCollation=utf8mb4_0900_bin";
const MARIADB_URL_PARAMETERS = "sessionVariables=time_zone='+09:00'&connectionCollation=utf8mb4_nopad_bin";
/**
 * SQL Server 의 접속 인자. 행 잠금 대기를 앱의 잠금 조회 상한(5초)과 같게 묶는다 — SET LOCK_TIMEOUT 은 커밋 뒤에도 세션에 남아 풀로 새고,
 * 이 인자가 없으면 대기 상한이 없다(2026-11-04 실측). 번들 DB 는 같은 도커 망이라 암호화를 끈다. 계약 시험이 application.yml 의 상한과 대조한다.
 */
const MSSQL_URL_PARAMETERS = 'encrypt=false;lockTimeout=5000';

/** sqlcmd. 이미지의 인증서를 믿는다(-C). 같은 클라이언트로 엔진 준비와 compose 상태 검사를 한다. */
export const SQLCMD = '/opt/mssql-tools18/bin/sqlcmd -C';
/**
 * 앱 DB 의 기본 콜레이션. N 없는 문자열 리터럴의 코드 페이지이고 표 변수도 이것을 따른다(2026-11-04 실측). 표의 문자열 컬럼은 어댑터가 이진 콜레이션으로 따로 둔다.
 * 서버 콜레이션(MSSQL_COLLATION)은 바꾸지 않는다 — 첫 기동에서 시스템 DB 를 다시 색인하는 동안 접속해 DB 를 만들거나 메타 조회만 해도 교착으로 서버가
 * 꺼진다(실측). 임시 표(#)는 서버 콜레이션을 따르므로 앱 컬럼과 비교하지 않는다(쓰는 코드가 없다).
 */
export const MSSQL_DATABASE_COLLATION = 'Korean_100_CI_AS';

/**
 * SQL Server 이미지는 앱 DB 와 계정을 만들지 않는다. 엔진 준비와 생성물 compose 의 DB 상태 검사가 이 문장을 쓴다.
 * 스냅숏 두 설정이 꺼지면 앱이 기동하지 않는다(SqlServerSqlDialect.assertSession). 상태 검사가 되풀이해 부르므로 이미 된 일은 다시 하지 않는다 —
 * READ_COMMITTED_SNAPSHOT 을 다시 켜면 ROLLBACK IMMEDIATE 가 앱 연결을 끊는다. 한 배치라 USE 뒤 문장은 동적 SQL 로 그 DB 에서 돈다(2026-11-04 실측).
 * 계정 이름과 비밀번호는 sqlcmd 변수 `$(NURI_APP_LOGIN)`·`$(NURI_APP_PASSWORD)` 로 받는다. sqlcmd 는 이 변수를 환경에서 채운다(실측) — 값이 명령행에 오지 않는다.
 * 계정 이름은 식별자 자리에서 대괄호로 감싼다 — 예약어(`user`·`public`)나 숫자로 시작하는 이름도 PostgreSQL 번들처럼 쓸 수 있다(독립 검토 지적).
 */
export function mssqlInitialization(database) {
  const login = '$(NURI_APP_LOGIN)';
  return [`IF DB_ID('${database}') IS NULL CREATE DATABASE ${database} COLLATE ${MSSQL_DATABASE_COLLATION}`,
    `IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = '${database}') = 0 ALTER DATABASE ${database} SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE`,
    `IF (SELECT snapshot_isolation_state FROM sys.databases WHERE name = '${database}') = 0 ALTER DATABASE ${database} SET ALLOW_SNAPSHOT_ISOLATION ON`,
    `IF SUSER_ID('${login}') IS NULL CREATE LOGIN [${login}] WITH PASSWORD = N'$(NURI_APP_PASSWORD)', CHECK_POLICY = OFF, DEFAULT_DATABASE = ${database}`,
    `EXEC ('USE ${database}; IF USER_ID(''${login}'') IS NULL CREATE USER [${login}] FOR LOGIN [${login}]; IF IS_ROLEMEMBER(''db_owner'', ''${login}'') = 0 ALTER ROLE db_owner ADD MEMBER [${login}]')`].join('; ');
}

/**
 * 초기화를 돌리는 셸 명령. 비밀은 환경으로만 넘긴다 — sa 비밀번호는 `SQLCMDPASSWORD`, 앱 비밀번호는 sqlcmd 변수다. 인자에 두면 컨테이너의 프로세스 목록에
 * 보인다(독립 검토 지적). 앱 비밀번호의 작은따옴표는 SQL 문자열에 맞게 두 번 쓴다. 계정 이름은 대괄호 식별자와 따옴표 문자열 안에 그대로 쓰이므로 `]`·`'` 가 없게 영문·숫자·밑줄만 받고 아니면 멈춘다.
 * 인자는 셸이 펼칠 식(`${APP_DB_USER}` 같은 변수)이나 글자 그대로의 값이다.
 */
export function mssqlInitializationCommand({ adminPassword, login, password, database }) {
  return `case "${login}" in ''|*[!A-Za-z0-9_]*) echo 'app login must use only letters, digits and _' >&2; exit 1;; esac; `
    + `SQLCMDPASSWORD="${adminPassword}" NURI_APP_LOGIN="${login}" NURI_APP_PASSWORD="$(printf '%s' "${password}" | sed "s/'/''/g")" `
    + `${SQLCMD} -b -S localhost -U sa -Q "${mssqlInitialization(database).replaceAll('$', '\\$')}"`;
}

/** compose 의 큰따옴표 문자열 안에 둘 셸 명령. `$` 는 Compose 호스트 치환을 피해 `$$` 로 쓴다. */
const composeQuoted = command => command.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('$', '$$$$');

const MSSQL_IMAGE = 'mcr.microsoft.com/mssql/server:2022-latest@sha256:4402d880dd4c34bfa7d8705e56a86cd6c88da80a1f6bbbe741f999e76264a090';

export const VENDOR_SOURCE = Object.freeze({
  oracle: Object.freeze({
    flywayPlugin: 'org.flywaydb:flyway-database-oracle',
    driverCoordinate: 'com.oracle.database.jdbc:ojdbc11:23.26.3.0.0',
    driverClass: 'oracle.jdbc.OracleDriver',
    url: 'jdbc:oracle:thin:@//localhost:1521/FREEPDB1',
    dialect: 'nuri.foundation.core.persistence.NuriOracleDialect',
    composeUrl: 'jdbc:oracle:thin:@//db:1521/FREEPDB1',
    composeVolume: 'oracle_data',
    // 개발용 이미지다. 운영 라이선스는 기관 몫이다.
    composeService: `  db:
    image: gvenzl/oracle-free:23-slim-faststart@sha256:f5ff19033860d662c821cb04eb10483fa94f14f78eae252d054291ea07028093
    container_name: egov-oracle
    restart: always
    ports:
      - "127.0.0.1:1521:1521"
    environment:
      TZ: Asia/Seoul
      # ⚠ 개발 전용 자격이다. 운영 오버레이가 DB_USERNAME/DB_PASSWORD 로 덮어쓴다.
      ORACLE_PASSWORD: egov123
      APP_USER: egov
      APP_USER_PASSWORD: egov123
    volumes:
      - oracle_data:/opt/oracle/oradata
    healthcheck:
      test: ["CMD", "healthcheck.sh"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 60s
    networks:
      - egov-net

`,
    composeProd: [[/^(\s*)POSTGRES_USER: (\$\{DB_USERNAME:\?[^\n]*\})$/m, '$1APP_USER: $2'],
      // ORACLE_PASSWORD 는 SYS 비밀번호다. 앱 자격이 새도 관리자 자격까지 번지지 않게 나눈다.
      [/^(\s*)POSTGRES_PASSWORD: (\$\{DB_PASSWORD:\?[^\n]*\})$/m, '$1APP_USER_PASSWORD: $2\n$1ORACLE_PASSWORD: ${DB_ADMIN_PASSWORD:?번들 DB의 DB_ADMIN_PASSWORD 가 필요합니다}']],
  }),
  mariadb: Object.freeze({
    flywayPlugin: 'org.flywaydb:flyway-mysql',
    driverCoordinate: 'org.mariadb.jdbc:mariadb-java-client:3.5.11',
    driverClass: 'org.mariadb.jdbc.Driver',
    urlParameters: MARIADB_URL_PARAMETERS,
    url: `jdbc:mariadb://localhost:3306/egovdb?${MARIADB_URL_PARAMETERS}`,
    dialect: 'org.hibernate.dialect.MariaDBDialect',
    composeUrl: `jdbc:mariadb://db:3306/egovdb?${MARIADB_URL_PARAMETERS}`,
    composeVolume: 'mariadb_data',
    // 개발용 공식 이미지다. 앱 계정(MARIADB_USER)은 그 DB 에만 모든 권한을 받는다.
    composeService: `  db:
    image: mariadb:11.4@sha256:d1891ede5a559f1086f55053bb8cc1569b0298338c4d72d71725a7f74f6ba620
    container_name: egov-mariadb
    restart: always
    ports:
      - "127.0.0.1:3306:3306"
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_nopad_bin"]
    environment:
      TZ: Asia/Seoul
      # ⚠ 개발 전용 자격이다. 운영 오버레이가 DB_USERNAME/DB_PASSWORD 로 덮어쓴다.
      MARIADB_ROOT_PASSWORD: egov123
      MARIADB_DATABASE: egovdb
      MARIADB_USER: egov
      MARIADB_PASSWORD: egov123
    volumes:
      - mariadb_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 60s
    networks:
      - egov-net

`,
    composeProd: [[/^(\s*)POSTGRES_USER: (\$\{DB_USERNAME:\?[^\n]*\})$/m, '$1MARIADB_USER: $2'],
      // MARIADB_ROOT_PASSWORD 는 root 비밀번호다. 앱 자격이 새도 관리자 자격까지 번지지 않게 나눈다.
      [/^(\s*)POSTGRES_PASSWORD: (\$\{DB_PASSWORD:\?[^\n]*\})$/m, '$1MARIADB_PASSWORD: $2\n$1MARIADB_ROOT_PASSWORD: ${DB_ADMIN_PASSWORD:?번들 DB의 DB_ADMIN_PASSWORD 가 필요합니다}']],
  }),
  mysql: Object.freeze({
    flywayPlugin: 'org.flywaydb:flyway-mysql',
    driverCoordinate: 'com.mysql:mysql-connector-j:26.10.0',
    driverClass: 'com.mysql.cj.jdbc.Driver',
    urlParameters: MYSQL_URL_PARAMETERS,
    url: `jdbc:mysql://localhost:3306/egovdb?${MYSQL_URL_PARAMETERS}`,
    dialect: 'org.hibernate.dialect.MySQLDialect',
    composeUrl: `jdbc:mysql://db:3306/egovdb?${MYSQL_URL_PARAMETERS}`,
    composeVolume: 'mysql_data',
    // 개발용 공식 이미지다. 바이너리 로그가 켜진 MySQL 에서 앱 계정이 트리거를 만들려면 log-bin-trust-function-creators 가 필요하다(없으면 1419).
    composeService: `  db:
    image: mysql:8.4@sha256:a81d043930e51745522bd5c430961cf8286f0a23f0a9a2a6e0108f7ea71b0902
    container_name: egov-mysql
    restart: always
    ports:
      - "127.0.0.1:3306:3306"
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_0900_bin", "--log-bin-trust-function-creators=1"]
    environment:
      TZ: Asia/Seoul
      # ⚠ 개발 전용 자격이다. 운영 오버레이가 DB_USERNAME/DB_PASSWORD 로 덮어쓴다.
      MYSQL_ROOT_PASSWORD: egov123
      MYSQL_DATABASE: egovdb
      MYSQL_USER: egov
      MYSQL_PASSWORD: egov123
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      # 초기화 중의 임시 서버는 TCP 를 열지 않는다. TCP 로 물어야 본 서버가 뜬 뒤에 준비로 본다.
      test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 --silent"]
      interval: 10s
      timeout: 5s
      retries: 30
      start_period: 60s
    networks:
      - egov-net

`,
    composeProd: [[/^(\s*)POSTGRES_USER: (\$\{DB_USERNAME:\?[^\n]*\})$/m, '$1MYSQL_USER: $2'],
      // MYSQL_ROOT_PASSWORD 는 root 비밀번호다. 앱 자격이 새도 관리자 자격까지 번지지 않게 나눈다.
      [/^(\s*)POSTGRES_PASSWORD: (\$\{DB_PASSWORD:\?[^\n]*\})$/m, '$1MYSQL_PASSWORD: $2\n$1MYSQL_ROOT_PASSWORD: ${DB_ADMIN_PASSWORD:?번들 DB의 DB_ADMIN_PASSWORD 가 필요합니다}']],
  }),
  mssql: Object.freeze({
    flywayPlugin: 'org.flywaydb:flyway-sqlserver',
    driverCoordinate: 'com.microsoft.sqlserver:mssql-jdbc:13.6.0.jre11',
    driverClass: 'com.microsoft.sqlserver.jdbc.SQLServerDriver',
    urlParameters: MSSQL_URL_PARAMETERS,
    url: `jdbc:sqlserver://localhost:1433;databaseName=egovdb;${MSSQL_URL_PARAMETERS}`,
    dialect: 'nuri.foundation.core.persistence.NuriSqlServerDialect',
    composeUrl: `jdbc:sqlserver://db:1433;databaseName=egovdb;${MSSQL_URL_PARAMETERS}`,
    composeVolume: 'mssql_data',
    // 개발용 Developer 에디션이다. 이미지가 앱 DB·계정을 만들지 않아 상태 검사가 만든다(되풀이해도 같은 결과다). 세션 시간대가 없어 서버 TZ 가 DB 시각이다.
    // sa 비밀번호는 SQL Server 의 복잡도 규칙(대문자·소문자·숫자·기호 중 셋, 8자 이상)을 따라야 서버가 기동한다.
    composeService: `  db:
    image: ${MSSQL_IMAGE}
    container_name: egov-mssql
    restart: always
    ports:
      - "127.0.0.1:1433:1433"
    environment:
      TZ: Asia/Seoul
      ACCEPT_EULA: "Y"
      MSSQL_PID: Developer
      # ⚠ 개발 전용 자격이다. 운영 오버레이가 DB_USERNAME/DB_PASSWORD/DB_ADMIN_PASSWORD 로 덮어쓴다.
      MSSQL_SA_PASSWORD: Egov_sa123
      APP_DB_USER: egov
      APP_DB_PASSWORD: egov123
    volumes:
      - mssql_data:/var/opt/mssql
    healthcheck:
      # \`$$\` 는 Compose 호스트 치환을 피하고 컨테이너 셸에서 \`$\` 로 전달하기 위한 이스케이프다. 비밀은 환경으로만 넘긴다.
      test: ["CMD-SHELL", "${composeQuoted(mssqlInitializationCommand({ adminPassword: '${MSSQL_SA_PASSWORD}', login: '${APP_DB_USER}', password: '${APP_DB_PASSWORD}', database: 'egovdb' }))}"]
      interval: 10s
      timeout: 10s
      retries: 30
      start_period: 60s
    networks:
      - egov-net

`,
    composeProd: [[/^(\s*)POSTGRES_USER: (\$\{DB_USERNAME:\?[^\n]*\})$/m, '$1APP_DB_USER: $2'],
      // MSSQL_SA_PASSWORD 는 sa 비밀번호다. 앱 자격이 새도 관리자 자격까지 번지지 않게 나눈다. Developer 에디션은 운영에 쓸 수 없어 에디션을 받는다.
      [/^(\s*)POSTGRES_PASSWORD: (\$\{DB_PASSWORD:\?[^\n]*\})$/m, '$1APP_DB_PASSWORD: $2\n$1MSSQL_SA_PASSWORD: ${DB_ADMIN_PASSWORD:?번들 DB의 DB_ADMIN_PASSWORD 가 필요합니다}'
        + '\n$1MSSQL_PID: ${MSSQL_PID:?운영 SQL Server 에디션(MSSQL_PID: Standard·Enterprise 또는 제품 키)이 필요합니다}']],
  }),
});
