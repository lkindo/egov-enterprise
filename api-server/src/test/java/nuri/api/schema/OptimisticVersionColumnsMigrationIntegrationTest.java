package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_133 이 동시 수정이 덮이던 10개 표에 낙관적 잠금 버전 컬럼을 더하는지 본다.
 *
 * <p>[왜 필요한가] 엔티티의 {@code @Version} 은 물리 컬럼이 {@code integer NOT NULL} 이어야 하고, 이미 있는 행은 0 으로
 * 시작해야 한다(NULL 이면 Hibernate 가 그 행을 저장하지 못한다). 컬럼을 모르는 이전 앱의 INSERT 도 기본값으로 채워져야
 * Expand 로서 안전하다. 음수 버전은 CHECK 로 막는다(V2_122 와 같다).
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_133 낙관적 잠금 버전 컬럼")
class OptimisticVersionColumnsMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final List<String> VERSIONED_TABLES = List.of(
            "tb_rpt_info", "tb_schdl_info", "tb_dept_task_info", "tb_rward_manage", "tb_bnr_info", "tb_popup_info",
            "tb_srvy_info", "tb_com_clsf_cd", "tb_com_cd", "tb_com_dtl_cd");

    @Test
    @DisplayName("10개 표에 version integer NOT NULL DEFAULT 0 이 생기고, 있던 행은 0, 생략 INSERT 도 0, 음수는 거부한다")
    void addsNonNegativeVersionStartingAtZero() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.130")));

        long reportSn;
        try (var c = openConnection(); var s = c.createStatement()) {
            for (String table : VERSIONED_TABLES) {
                assertThat(count(s, "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema()"
                        + " AND table_name = '" + table + "' AND column_name = 'version'"))
                        .as("%s 에는 아직 버전 컬럼이 없다", table).isZero();
            }
            reportSn = Long.parseLong(text(s, "INSERT INTO tb_rpt_info (rpt_ttl, user_id, frst_rgtr_id) "
                    + "VALUES ('이전 보고', 'legacy01', 'legacy01') RETURNING rptp_sn"));
            s.executeUpdate("INSERT INTO tb_com_clsf_cd (clsf_cd, clsf_cd_nm, use_yn) VALUES ('V133OLD', '이전 분류', 'Y')");
        }

        flyway(MigrationVersion.fromVersion("2.133")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            for (String table : VERSIONED_TABLES) {
                try (ResultSet column = s.executeQuery("SELECT data_type, is_nullable, column_default FROM information_schema.columns"
                        + " WHERE table_schema = current_schema() AND table_name = '" + table + "' AND column_name = 'version'")) {
                    assertThat(column.next()).as("%s.version 이 생겼다", table).isTrue();
                    assertThat(column.getString(1)).as("%s.version 타입", table).isEqualTo("integer");
                    assertThat(column.getString(2)).as("%s.version 은 NOT NULL", table).isEqualTo("NO");
                    assertThat(column.getString(3)).as("%s.version 기본값", table).isEqualTo("0");
                }
                assertThat(count(s, "SELECT count(*) FROM pg_constraint WHERE conname = 'ck_" + table + "_version'"))
                        .as("%s 의 음수 버전 CHECK", table).isOne();
            }
            assertThat(text(s, "SELECT version FROM tb_rpt_info WHERE rptp_sn = " + reportSn))
                    .as("이미 있던 행은 0 으로 시작한다").isEqualTo("0");
            assertThat(text(s, "SELECT version FROM tb_com_clsf_cd WHERE clsf_cd = 'V133OLD'")).isEqualTo("0");

            // 이 컬럼을 모르는 이전 앱의 INSERT 도 기본값으로 채워진다(Expand 안전).
            long laterSn = Long.parseLong(text(s, "INSERT INTO tb_rpt_info (rpt_ttl, user_id) VALUES ('이후 보고', 'legacy02')"
                    + " RETURNING rptp_sn"));
            assertThat(text(s, "SELECT version FROM tb_rpt_info WHERE rptp_sn = " + laterSn)).isEqualTo("0");

            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_com_clsf_cd SET version = -1 WHERE clsf_cd = 'V133OLD'"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_com_clsf_cd_version");
        }
    }

    private static long count(Statement statement, String query) throws SQLException {
        return Long.parseLong(text(statement, query));
    }

    private static String text(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getString(1);
        }
    }
}
