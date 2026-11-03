/**
 * 벤더별 소스 값(ADR-0047 D-11). 값만 둔다 — 인증 원장 판정(project-composer-vendors.mjs)이 투영 유무를 보는데,
 * 투영 코드는 그 판정 모듈의 어댑터를 가져오므로 값을 나눠야 순환이 생기지 않는다.
 * 드라이버 판은 이관 도구와 같다.
 */
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
});
