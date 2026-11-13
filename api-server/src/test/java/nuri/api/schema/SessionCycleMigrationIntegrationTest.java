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
 * V2_153 세션차수(즉시 토큰 무효화)와 사용자 등록일 정렬 인덱스. 기존 계정은 차수 0 으로 시작해 배포가 기존 세션을 끊지 않고,
 * 차수는 한 문장 증가로만 오르며 음수가 될 수 없다.
 */
@Tag("schema-validation")
@DisplayName("V2_153 사용자 세션차수와 등록일 인덱스")
class SessionCycleMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("세션차수를 NOT NULL 기본값 0 으로 더해 기존 행을 0 으로 두고, 표준 용어·CHECK·등록일 인덱스를 둔다")
    void addsSessionCycleWithZeroDefaultAndSortIndex() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.152")));
        long users;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(number(statement, "SELECT count(*) FROM meta_standard_terms WHERE eng_abbr = 'SSN_CYCL'"))
                    .as("V2_153 전에는 새 용어가 없다").isZero();
            statement.executeUpdate("INSERT INTO tb_user_info(esntl_id,user_id,user_nm,pswd,user_stts_cd,lck_yn,sbscrb_ymd) "
                    + "VALUES('V2153_BEFORE','v2153-before','v2153 fixture','!authentication-disabled!','P','N','20261112')");
            users = number(statement, "SELECT count(*) FROM tb_user_info");
        }

        flyway(MigrationVersion.fromVersion("2.153")).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(text(statement, "SELECT data_type || ':' || numeric_precision || ':' || numeric_scale || ':'"
                    + " || is_nullable || ':' || column_default FROM information_schema.columns"
                    + " WHERE table_name = 'tb_user_info' AND column_name = 'ssn_cycl'"))
                    .isEqualTo("numeric:7:0:NO:0");
            assertThat(number(statement, "SELECT count(*) FROM tb_user_info WHERE ssn_cycl = 0"))
                    .as("기존 계정은 차수 0 으로 시작한다 — 차수를 담지 않은 기존 토큰(0)이 배포 뒤에도 통한다").isEqualTo(users);
            assertThat(text(statement, "SELECT term_name || ':' || domain_name || ':' || deprecated_yn"
                    + " FROM meta_standard_terms WHERE eng_abbr = 'SSN_CYCL'")).isEqualTo("세션차수:수N7:N");
            assertThat(text(statement, "SELECT indexdef FROM pg_indexes WHERE indexname = 'ix_tb_user_info_crt_dt'"))
                    .contains("tb_user_info").contains("(crt_dt)");
            assertThat(number(statement, "SELECT count(*) FROM pg_constraint WHERE conname = 'ck_tb_user_info_ssn_cycl'"))
                    .isEqualTo(1);

            String esntlId = "V2153_BEFORE";
            statement.executeUpdate("UPDATE tb_user_info SET ssn_cycl = ssn_cycl + 1 WHERE esntl_id = '" + esntlId + "'");
            assertThat(number(statement, "SELECT ssn_cycl FROM tb_user_info WHERE esntl_id = '" + esntlId + "'"))
                    .as("무효화는 한 문장 증가다").isEqualTo(1);
            assertThatThrownBy(() -> statement.executeUpdate(
                    "UPDATE tb_user_info SET ssn_cycl = -1 WHERE esntl_id = '" + esntlId + "'"))
                    .as("차수는 음수가 될 수 없다").isInstanceOf(SQLException.class);
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
