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
});
