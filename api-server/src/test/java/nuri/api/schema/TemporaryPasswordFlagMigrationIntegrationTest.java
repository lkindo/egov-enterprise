package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_118 이 임시 비밀번호 여부를 기존 계정에 'N' 으로 두고 Y·N 밖의 값을 막는지 본다.
 *
 * <p>[왜 필요한가] 기본값이 'Y' 면 배포하는 순간 모든 계정이 비밀번호 변경 화면에 갇힌다(결정 18).
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_118 임시 비밀번호 여부")
class TemporaryPasswordFlagMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("새 컬럼은 NULL 이 아니고 기본값 'N' 이며, Y·N 밖의 값은 CHECK 가 거부한다")
    void addsNonNullFlagDefaultingToNo() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.117")));
        flyway(MigrationVersion.fromVersion("2.118")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(text(s, "SELECT is_nullable || ':' || column_default FROM information_schema.columns"
                    + " WHERE table_name = 'tb_user_info' AND column_name = 'tmpr_pswd_yn'"))
                    .as("기존 계정은 바꿀 의무 없이 시작한다").isEqualTo("NO:'N'::character varying");
            assertThat(text(s, "SELECT pg_get_constraintdef(oid) FROM pg_constraint"
                    + " WHERE conname = 'ck_tb_user_info_tmpr_pswd_yn'"))
                    .contains("'Y'").contains("'N'");
        }
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
