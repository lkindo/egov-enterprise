package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 🐘 실 PostgreSQL 스키마 검증 게이트 — "테스트는 운영 스키마를 본 적이 없다" 를 끝낸다.
 *
 * <p>[근거] 2026-07-26 사고에서 엔티티 69종의 PK 전략이 일괄 변경됐는데 컴파일·테스트가 모두 그린이었다.
 * 단위 테스트 프로파일이 <b>H2 + {@code ddl-auto: create-drop}</b> 이라 Hibernate 가 엔티티 정의대로
 * 스키마를 새로 만들기 때문이다 — 즉 그 그린은 "엔티티가 엔티티와 일치한다" 는 동어반복이었다.
 *
 * <p>이 테스트는 반대로 간다.
 * <ol>
 *   <li>빈 PostgreSQL 17 컨테이너를 띄우고(Testcontainers)</li>
 *   <li><b>실제 Flyway 마이그레이션 전량</b>을 적용한 뒤</li>
 *   <li><b>{@code ddl-auto: validate}</b> 로 전 엔티티 매핑을 Hibernate 에게 대조시킨다.</li>
 * </ol>
 * 컨텍스트가 뜨는 것 자체가 검증이다 — 매핑이 물리 스키마와 어긋나면 {@code SchemaManagementException}
 * 으로 부팅이 실패한다. 오프라인 린터({@code EntitySchemaConformanceLinterTest})가 잡지 못하는
 * 타입 계열 불일치·시퀀스 부재·정밀도까지 Hibernate 자신이 판정한다.
 *
 * <p><b>계층</b>: Docker 의존이라 pre-push 가 아니라 {@code ./gradlew :api-server:schemaValidationTest}
 * (= {@code localGate}·CI) 계층이다. 기본 {@code test} 태스크에서는 {@code schema-validation} 태그로
 * 제외돼 Docker 없는 환경의 일반 테스트를 깨지 않는다 — 다만 <b>조용히 스킵되는 것이 아니라
 * 전용 태스크에서 반드시 실행</b>되며, Docker 가 없으면 그 태스크는 실패한다(무음 통과 금지).
 */
@Tag("schema-validation")
@SpringBootTest
@ActiveProfiles({"test", "tc"})
@DisplayName("🐘 실 PostgreSQL + Flyway 전량 적용 후 엔티티 매핑 검증(ddl-auto: validate)")
class SchemaValidationIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("Flyway 마이그레이션이 실 PostgreSQL 에 적용되고 전 엔티티 매핑이 검증된다")
    void migrationsApplyAndEntitiesValidateAgainstRealPostgres() throws SQLException {
        // 이 메서드가 실행됐다는 것은 이미 ① Flyway migrate ② Hibernate validate 가 통과했다는 뜻이다.
        // (실패 시 ApplicationContext 로딩 단계에서 SchemaManagementException 으로 죽는다.)
        try (Connection conn = dataSource.getConnection();
             Statement st = conn.createStatement()) {

            String product = conn.getMetaData().getDatabaseProductName();
            assertThat(product)
                    .as("H2 로 폴백되면 create-drop 시절과 같은 거짓 안전이 된다 — 반드시 실 PostgreSQL 이어야 한다")
                    .isEqualTo("PostgreSQL");

            // 게이트 무결성(false-green 방지): 마이그레이션이 실제로 적용됐는지 이력으로 확인
            int applied = 0;
            try (ResultSet rs = st.executeQuery(
                    "SELECT count(*) FROM flyway_schema_history WHERE success = true")) {
                if (rs.next()) {
                    applied = rs.getInt(1);
                }
            }
            assertThat(applied)
                    .as("Flyway 적용 건수가 비정상 — 마이그레이션이 실제로 실행되지 않았다면 validate 는 무의미하다")
                    .isGreaterThanOrEqualTo(20);

            int tables = 0;
            try (ResultSet rs = st.executeQuery(
                    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")) {
                if (rs.next()) {
                    tables = rs.getInt(1);
                }
            }
            assertThat(tables)
                    .as("물리 테이블 수가 비정상 — 스키마가 비어 있으면 validate 통과는 vacuous 하다")
                    .isGreaterThanOrEqualTo(50);
        }
    }
}
