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

    private static final List<String> V2_149_VERSIONED_TABLES = List.of(
            "tb_hlp_info", "tb_onln_mnl_info", "tb_event_info", "tb_extrl_hr_info", "tb_memo_rpt_info",
            "tb_cmnty_info", "tb_onln_poll_manage", "tb_srvy_tmplt", "tb_tmplt_info");

    private static final String AUTH_HISTORY_TARGET_INDEX = "ix_tb_authrt_chg_hstry_scrty_dcsn_trgt_id";

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

    @Test
    @DisplayName("V2_149: 나머지 9개 쓰기 표에 version 이 생기고 권한 변경 이력 대상 사용자 인덱스가 실행 계획에 쓰인다")
    void v2_149AddsRemainingOptimisticVersionsAndAuthorizationHistoryIndex() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.148")));

        long memoSn;
        try (var c = openConnection(); var s = c.createStatement()) {
            for (String table : V2_149_VERSIONED_TABLES) {
                assertThat(count(s, "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema()"
                        + " AND table_name = '" + table + "' AND column_name = 'version'"))
                        .as("%s 에는 V2_149 이전까지 버전 컬럼이 없다", table).isZero();
            }
            assertThat(count(s, "SELECT count(*) FROM pg_indexes WHERE schemaname = current_schema()"
                    + " AND indexname = '" + AUTH_HISTORY_TARGET_INDEX + "'")).isZero();

            memoSn = Long.parseLong(text(s, "INSERT INTO tb_memo_rpt_info (rpt_ttl, user_id, rptr_id, frst_rgtr_id) "
                    + "VALUES ('이전 메모보고', 'legacy01', 'legacy02', 'legacy01') RETURNING memo_rpt_sn"));
            s.executeUpdate("INSERT INTO tb_tmplt_info (tmplt_id, tmplt_nm, tmplt_se_cd, tmplt_path, use_yn) "
                    + "VALUES ('V149OLD', '이전 템플릿', 'TMPT01', '/src/templates/legacy', 'Y')");
            s.executeUpdate("INSERT INTO tb_authrt_chg_hstry "
                    + "(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd, scrty_dcsn_trgt_id, chg_artcl_nm, chg_aftr_cn, frst_rgtr_id, crt_dt) "
                    + "SELECT 'REQ-' || n, 'v1', 'USER_GROUP', 'ADD', 'ROLE_USER', 'U' || lpad((n % 500)::text, 10, '0'), "
                    + "'user_group_assignment', 'ROLE_USER', 'SYSTEM', CURRENT_TIMESTAMP FROM generate_series(1, 5000) n");
        }

        flyway(MigrationVersion.fromVersion("2.149")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            for (String table : V2_149_VERSIONED_TABLES) {
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
            assertThat(text(s, "SELECT version FROM tb_memo_rpt_info WHERE memo_rpt_sn = " + memoSn)).isEqualTo("0");
            assertThat(text(s, "SELECT version FROM tb_tmplt_info WHERE tmplt_id = 'V149OLD'")).isEqualTo("0");

            long laterMemoSn = Long.parseLong(text(s, "INSERT INTO tb_memo_rpt_info (rpt_ttl, user_id, rptr_id) "
                    + "VALUES ('이후 메모보고', 'legacy03', 'legacy04') RETURNING memo_rpt_sn"));
            assertThat(text(s, "SELECT version FROM tb_memo_rpt_info WHERE memo_rpt_sn = " + laterMemoSn)).isEqualTo("0");

            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_tmplt_info SET version = -1 WHERE tmplt_id = 'V149OLD'"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_tmplt_info_version");

            s.execute("ANALYZE tb_authrt_chg_hstry");
            String plan = text(s, "EXPLAIN (FORMAT JSON) SELECT coalesce(max(authrt_chg_hstry_sn), 0)"
                    + " FROM tb_authrt_chg_hstry WHERE scrty_dcsn_trgt_id = 'U0000000042'");
            assertThat(plan).contains(AUTH_HISTORY_TARGET_INDEX);
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
