package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_117 이 기존 설문은 공개로 두고 새 설문만 작성 중으로 시작하게 하는지, 그리고 Y·N 밖의 값을 막는지 본다.
 *
 * <p>[왜 필요한가] 기본값을 처음부터 'N' 으로 두면 이미 응답자에게 보이던 설문이 한꺼번에 사라진다. 반대로
 * 기본값을 'Y' 로 남기면 새 설문이 등록하는 순간 응답자에게 보인다(결정 21).
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_117 설문 공개 여부")
class SurveyReleaseFlagMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("기존 설문은 공개(Y), 새 설문은 작성 중(N)으로 시작하고, Y·N 밖의 값은 거부한다")
    void keepsExistingSurveysReleasedAndStartsNewOnesAsDrafts() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.116")));

        long templateSn;
        long existingSn;
        try (var c = openConnection(); var s = c.createStatement()) {
            templateSn = key(s, "INSERT INTO tb_srvy_tmplt (srvy_tmplt_type_cd) VALUES ('REL') RETURNING srvy_tmplt_sn");
            existingSn = key(s, "INSERT INTO tb_srvy_info (srvy_tmplt_sn, srvy_ttl) VALUES (" + templateSn
                    + ", '이미 공개된 설문') RETURNING srvy_sn");
        }

        flyway(MigrationVersion.fromVersion("2.117")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(text(s, "SELECT rls_yn FROM tb_srvy_info WHERE srvy_sn = " + existingSn))
                    .as("이 변경 전 설문은 응답자에게 계속 보인다").isEqualTo("Y");
            long draftSn = key(s, "INSERT INTO tb_srvy_info (srvy_tmplt_sn, srvy_ttl) VALUES (" + templateSn
                    + ", '새 설문') RETURNING srvy_sn");
            assertThat(text(s, "SELECT rls_yn FROM tb_srvy_info WHERE srvy_sn = " + draftSn))
                    .as("새 설문은 작성 중으로 시작한다").isEqualTo("N");
            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_srvy_info SET rls_yn = 'X' WHERE srvy_sn = " + draftSn))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_srvy_info_rls_yn");
        }
    }

    private static long key(Statement statement, String query) throws SQLException {
        return Long.parseLong(text(statement, query));
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
