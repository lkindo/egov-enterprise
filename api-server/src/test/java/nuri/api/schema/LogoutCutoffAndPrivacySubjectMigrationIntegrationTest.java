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
 * V2_131 이 로그아웃 시각(tb_user_info.last_lgt_dt)과 개인정보 접근 기록의 정보주체(tb_privacy_log.trpr_id)를 기존 행을 바꾸지 않고
 * 더하는지, 새 표준 용어를 사전과 함께 등록하는지 본다.
 *
 * <p>[왜 필요한가] 기본값을 두면 배포하는 순간 기존 세션이 모두 끊기거나(로그아웃 시각을 지금으로 채우면 그 전 발급 토큰이 거부된다)
 * 지난 접근 기록에 없는 정보주체가 생긴다. 두 컬럼은 NULL('모른다')로 시작해야 한다. 길이는 표준 도메인과 같아야 한다(명V20 =
 * esntlId 20자, 연월일시분초D = timestamp).
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_131 로그아웃 시각과 개인정보 접근 기록의 정보주체")
class LogoutCutoffAndPrivacySubjectMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("두 컬럼을 NULL 허용·기본값 없이 더하고 기존 행은 NULL 로 두며, 대상자아이디 용어를 명V20 으로 등록한다")
    void addsNullableColumnsWithoutTouchingExistingRows() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.130")));
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM meta_standard_terms WHERE eng_abbr = 'TRPR_ID'"))
                    .as("V2_131 전에는 새 용어가 없다").isZero();
            statement.executeUpdate("INSERT INTO tb_privacy_log (dmnd_id, inq_dt, dmnd_user_id) "
                    + "VALUES ('V2131_BEFORE', CURRENT_TIMESTAMP, 'webmaster')");
        }
        long users;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            users = number(statement, "SELECT count(*) FROM tb_user_info");
        }

        flyway(MigrationVersion.fromVersion("2.131")).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(text(statement, "SELECT data_type || ':' || is_nullable || ':' || coalesce(column_default, '-')"
                    + " FROM information_schema.columns WHERE table_name = 'tb_user_info' AND column_name = 'last_lgt_dt'"))
                    .isEqualTo("timestamp without time zone:YES:-");
            assertThat(text(statement, "SELECT data_type || ':' || character_maximum_length || ':' || is_nullable || ':'"
                    + " || coalesce(column_default, '-') FROM information_schema.columns"
                    + " WHERE table_name = 'tb_privacy_log' AND column_name = 'trpr_id'"))
                    .isEqualTo("character varying:20:YES:-");
            assertThat(number(statement, "SELECT count(*) FROM tb_user_info WHERE last_lgt_dt IS NULL"))
                    .as("기존 계정은 로그아웃한 적 없음으로 시작한다 — 배포가 기존 세션을 끊지 않는다").isEqualTo(users);
            assertThat(number(statement, "SELECT count(*) FROM tb_privacy_log WHERE dmnd_id = 'V2131_BEFORE' AND trpr_id IS NULL"))
                    .as("지난 접근 기록에 정보주체를 지어내지 않는다").isEqualTo(1);
            assertThat(text(statement, "SELECT term_name || ':' || domain_name || ':' || deprecated_yn"
                    + " FROM meta_standard_terms WHERE eng_abbr = 'TRPR_ID'")).isEqualTo("대상자아이디:명V20:N");
            assertThat(text(statement, "SELECT term_name || ':' || domain_name"
                    + " FROM meta_standard_terms WHERE eng_abbr = 'LAST_LGT_DT'")).isEqualTo("최종로그아웃일시:연월일시분초D");
            assertThat(number(statement, "SELECT count(*) FROM pg_constraint WHERE contype = 'f'"
                    + " AND conrelid = 'tb_privacy_log'::regclass"))
                    .as("접근 기록은 사용자를 지운 뒤에도 보존 기간 동안 남아야 한다 — 외래 키를 두지 않는다").isZero();
        }
    }

    private static long number(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
