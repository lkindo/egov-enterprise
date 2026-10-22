package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_139 가 게시판 마스터에 낙관적 잠금 버전을 두고, 게시판 변경 이력 표를 만드는지 본다(2026-10-23 ADR-0040 결정 9·10).
 *
 * <p>[왜 필요한가] 엔티티의 {@code @Version} 은 물리 컬럼이 {@code integer NOT NULL} 이어야 하고 이미 있는 게시판은 0 으로
 * 시작해야 한다. 컬럼을 모르는 이전 앱의 INSERT 도 기본값으로 채워져야 Expand 로서 안전하다. 이력 표는 추가 전용이고
 * 대상 유형·변경 유형·대상 모양·전후 값 CHECK 가 잘못된 행을 막아야 한다. 게시판을 영구 삭제해도 이력이 남도록 외래 키가 없다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_139 게시판 변경 이력과 마스터 버전")
class BoardChangeHistoryMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String LEGACY_BOARD = "V139_LEGACY";
    private static final String LATER_BOARD = "V139_LATER";
    private static final String HISTORY_COLUMNS = "INSERT INTO tb_bbs_chg_hstry (chg_trgt_type_cd, chg_type_cd, bbs_id, pst_sn,"
            + " chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_user_idntfr, frst_rgtr_id, crt_dt) VALUES ";

    // 클래스가 DB 하나를 쓰므로(@BeforeAll) 마이그레이션 전후를 보는 단계를 한 시험 안에서 차례로 둔다.
    @Test
    @DisplayName("마스터 버전(있던 행·생략 INSERT 0, 음수 거부)과 외래 키 없는 이력 표(유형·모양·빈 값 CHECK)를 만든다")
    void addsMasterVersionAndAppendOnlyHistoryTable() throws Exception {
        addsNonNegativeMasterVersionStartingAtZero();
        createsAppendOnlyHistoryTableWithShapeChecks();
    }

    private void addsNonNegativeMasterVersionStartingAtZero() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.138")));
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema()"
                    + " AND table_name = 'tb_bbs_master' AND column_name = 'version'")).as("아직 버전 컬럼이 없다").isZero();
            insertBoard(s, LEGACY_BOARD);
        }

        flyway(MigrationVersion.fromVersion("2.139")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            try (ResultSet column = s.executeQuery("SELECT data_type, is_nullable, column_default FROM information_schema.columns"
                    + " WHERE table_schema = current_schema() AND table_name = 'tb_bbs_master' AND column_name = 'version'")) {
                assertThat(column.next()).as("tb_bbs_master.version 이 생겼다").isTrue();
                assertThat(column.getString(1)).isEqualTo("integer");
                assertThat(column.getString(2)).isEqualTo("NO");
                assertThat(column.getString(3)).isEqualTo("0");
            }
            assertThat(count(s, "SELECT count(*) FROM pg_constraint WHERE conname = 'ck_tb_bbs_master_version'")).isOne();
            assertThat(count(s, "SELECT count(*) FROM tb_bbs_master WHERE version <> 0"))
                    .as("이미 있던 게시판(시드 포함)은 모두 0 으로 시작한다").isZero();
            assertThat(text(s, "SELECT version FROM tb_bbs_master WHERE bbs_id = '" + LEGACY_BOARD + "'")).isEqualTo("0");

            // 이 컬럼을 모르는 이전 앱의 INSERT 도 기본값으로 채워진다(Expand 안전).
            insertBoard(s, LATER_BOARD);
            assertThat(text(s, "SELECT version FROM tb_bbs_master WHERE bbs_id = '" + LATER_BOARD + "'")).isEqualTo("0");

            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_bbs_master SET version = -1 WHERE bbs_id = '" + LEGACY_BOARD + "'"))
                    .isInstanceOf(SQLException.class).hasMessageContaining("ck_tb_bbs_master_version");
        }
    }

    private void createsAppendOnlyHistoryTableWithShapeChecks() throws Exception {
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(texts(s, "SELECT column_name || ':' || data_type || ':' || is_nullable"
                    + " || ':' || coalesce(character_maximum_length::text, '-') FROM information_schema.columns"
                    + " WHERE table_schema = current_schema() AND table_name = 'tb_bbs_chg_hstry' ORDER BY ordinal_position"))
                    .containsExactly(
                            "bbs_chg_hstry_sn:bigint:NO:-",
                            "chg_trgt_type_cd:character varying:NO:12",
                            "chg_type_cd:character varying:NO:12",
                            "bbs_id:character varying:NO:20",
                            "pst_sn:bigint:YES:-",
                            "chg_artcl_nm:character varying:NO:100",
                            "chg_bfr_cn:character varying:YES:4000",
                            "chg_aftr_cn:character varying:YES:4000",
                            "chg_user_idntfr:character varying:YES:20",
                            "frst_rgtr_id:character varying:NO:20",
                            "crt_dt:timestamp without time zone:NO:-");
            assertThat(text(s, "SELECT pg_get_serial_sequence('tb_bbs_chg_hstry', 'bbs_chg_hstry_sn')"))
                    .as("식별 번호는 표가 소유한 identity 시퀀스다").endsWith("sq_bbs_chg_hstry_sn");
            assertThat(count(s, "SELECT count(*) FROM pg_indexes WHERE indexname = 'ix_tb_bbs_chg_hstry_bbs_id'")).isOne();
            assertThat(count(s, "SELECT count(*) FROM pg_constraint WHERE conrelid = 'tb_bbs_chg_hstry'::regclass AND contype = 'f'"))
                    .as("영구 삭제한 게시판의 이력도 남도록 외래 키를 두지 않는다").isZero();

            // 정상 행: 게시판 행은 게시글 번호가 없고, 게시글 행은 있다. 없는 게시판 ID 도 받는다(외래 키 없음).
            s.executeUpdate(HISTORY_COLUMNS + "('BBS', 'USE', 'GONE_BOARD', NULL, '게시판 사용', 'Y', 'N', 'U1', 'admin', now())");
            s.executeUpdate(HISTORY_COLUMNS + "('PST', 'PIN', 'GONE_BOARD', 7, '상단 고정', NULL, 'Y', 'U1', 'admin', now())");
            assertThat(count(s, "SELECT count(*) FROM tb_bbs_chg_hstry WHERE bbs_id = 'GONE_BOARD'")).isEqualTo(2);

            assertRejected(s, "('BRD', 'USE', 'B1', NULL, '게시판 사용', 'Y', 'N', 'U1', 'admin', now())",
                    "ck_tb_bbs_chg_hstry_chg_trgt_type_cd");
            assertRejected(s, "('BBS', 'DELETE', 'B1', NULL, '게시판 사용', 'Y', 'N', 'U1', 'admin', now())",
                    "ck_tb_bbs_chg_hstry_chg_type_cd");
            assertRejected(s, "('BBS', 'SETTING', 'B1', 3, '제목', 'a', 'b', 'U1', 'admin', now())",
                    "ck_tb_bbs_chg_hstry_target_shape");
            assertRejected(s, "('PST', 'PERIOD', 'B1', NULL, '게시 종료일', '20260101', '20261231', 'U1', 'admin', now())",
                    "ck_tb_bbs_chg_hstry_target_shape");
            assertRejected(s, "('BBS', 'SETTING', 'B1', NULL, '설명', NULL, NULL, 'U1', 'admin', now())",
                    "ck_tb_bbs_chg_hstry_change_value");
        }
    }

    private static void assertRejected(Statement statement, String values, String constraint) {
        assertThatThrownBy(() -> statement.executeUpdate(HISTORY_COLUMNS + values))
                .as("%s 가 거부한다", constraint)
                .isInstanceOf(SQLException.class).hasMessageContaining(constraint);
    }

    private static void insertBoard(Statement statement, String bbsId) throws SQLException {
        statement.executeUpdate("INSERT INTO tb_bbs_master"
                + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)"
                + " VALUES ('" + bbsId + "', '버전 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')");
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

    private static List<String> texts(Statement statement, String query) throws SQLException {
        List<String> values = new ArrayList<>();
        try (ResultSet result = statement.executeQuery(query)) {
            while (result.next()) {
                values.add(result.getString(1));
            }
        }
        return values;
    }
}
