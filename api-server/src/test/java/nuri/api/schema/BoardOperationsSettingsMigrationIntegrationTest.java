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
 * 게시판 운영 관리 B 배치(ADR-0040 결정 3·5·6·7)의 설정 컬럼과 표준 용어 등록을 마이그레이션마다 본다. V2_140(예약 게시
 * 설정), V2_141(상단 고정과 고정 정책), V2_142(비밀글 정책과 추천 받기)다 — 뒤 배치의 마이그레이션은 같은 시험 안에 단계를 이어
 * 붙인다.
 *
 * <p>[왜 필요한가] 새 설정은 {@code NOT NULL DEFAULT} 컬럼이라, 이미 있는 게시판과 이 컬럼을 모르는 이전 앱의 INSERT 가 모두
 * 지금 동작을 뜻하는 기본값으로 채워져야 Expand 로서 안전하다. 허용값 밖의 값은 CHECK 가 막아야 하고, 컬럼 이름의 표준 용어는
 * 같은 마이그레이션이 정확히 한 건 등록해야 한다(DB 헌법 제9조, 승인 목록의 신규 용어 6건 — DEC-OPS-379).
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_140·V2_141·V2_142 게시판 운영 설정 컬럼과 표준 용어")
class BoardOperationsSettingsMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String LEGACY_BOARD = "V140_LEGACY";
    private static final String LATER_BOARD = "V140_LATER";
    private static final String PIN_LATER_BOARD = "V141_LATER";
    private static final String POLICY_LATER_BOARD = "V142_LATER";

    // 클래스가 DB 하나를 쓰므로(@BeforeAll) 마이그레이션 전후를 보는 단계를 한 시험 안에서 차례로 둔다.
    @Test
    @DisplayName("예약 게시 설정(N 기본), 상단 고정(N·종료일 없음)과 고정 정책(N·5·30), 비밀글 정책(NONE)·추천 받기(Y)를 기본값·CHECK·표준 용어와 함께 더한다")
    void addsBoardOperationSettingsWithDefaultsChecksAndTerms() throws Exception {
        addsReservationSettingDefaultingToNo();
        addsPostPinningAndPinPolicy();
        addsPrivatePostPolicyAndRecommendationSwitch();
    }

    /**
     * V2_142 — 게시판의 비밀글 정책(prvt_pst_plcy_cd, NONE·OPTIONAL·REQUIRED)과 추천 받기(rcmdtn_use_yn, 기존 용어)다(ADR-0040
     * 결정 6·7). 이미 있던 게시판(시드의 Q&A 게시판 포함)은 데이터 변경 없이 지금 동작인 NONE·Y 로 시작한다. 새 용어는
     * PRVT_PST_PLCY_CD 하나이고, 기존 용어 RCMDTN_USE_YN 은 손대지 않는다.
     */
    private void addsPrivatePostPolicyAndRecommendationSwitch() throws Exception {
        long termsBefore;
        String recommendationTermBefore;
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema()"
                    + " AND table_name = 'tb_bbs_master' AND column_name IN ('prvt_pst_plcy_cd', 'rcmdtn_use_yn')"))
                    .as("아직 비밀글 정책·추천 받기 컬럼이 없다").isZero();
            assertThat(count(s, "SELECT count(*) FROM meta_standard_terms WHERE eng_abbr = 'PRVT_PST_PLCY_CD'"))
                    .as("V2_142 전에는 새 용어가 없다").isZero();
            termsBefore = count(s, "SELECT count(*) FROM meta_standard_terms");
            recommendationTermBefore = text(s, RECOMMENDATION_TERM);
        }

        flyway(MigrationVersion.fromVersion("2.142")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(columnShape(s, "tb_bbs_master", "prvt_pst_plcy_cd"))
                    .isEqualTo("character varying:12:NO:'NONE'::character varying");
            assertThat(columnShape(s, "tb_bbs_master", "rcmdtn_use_yn"))
                    .isEqualTo("character varying:1:NO:'Y'::character varying");
            assertThat(count(s, "SELECT count(*) FROM tb_bbs_master WHERE prvt_pst_plcy_cd <> 'NONE' OR rcmdtn_use_yn <> 'Y'"))
                    .as("이미 있던 게시판(시드의 Q&A 게시판 포함)은 데이터 변경 없이 NONE·추천 받음으로 시작한다").isZero();
            assertThat(text(s, "SELECT prvt_pst_plcy_cd || ':' || rcmdtn_use_yn FROM tb_bbs_master WHERE bbs_id = '"
                    + LEGACY_BOARD + "'")).isEqualTo("NONE:Y");

            // 이 컬럼들을 모르는 이전 앱의 INSERT 도 기본값으로 채워진다(Expand 안전).
            insertBoard(s, POLICY_LATER_BOARD);
            assertThat(text(s, "SELECT prvt_pst_plcy_cd || ':' || rcmdtn_use_yn FROM tb_bbs_master WHERE bbs_id = '"
                    + POLICY_LATER_BOARD + "'")).isEqualTo("NONE:Y");

            String setPolicy = "UPDATE tb_bbs_master SET %s WHERE bbs_id = '" + LEGACY_BOARD + "'";
            assertRejected(s, setPolicy.formatted("prvt_pst_plcy_cd = 'SECRET'"), "ck_tb_bbs_master_prvt_pst_plcy_cd");
            assertRejected(s, setPolicy.formatted("prvt_pst_plcy_cd = 'required'"), "ck_tb_bbs_master_prvt_pst_plcy_cd");
            assertRejected(s, setPolicy.formatted("rcmdtn_use_yn = 'X'"), "ck_tb_bbs_master_rcmdtn_use_yn");
            assertThatThrownBy(() -> s.executeUpdate(setPolicy.formatted("prvt_pst_plcy_cd = NULL")))
                    .as("비밀글 정책은 비울 수 없다").isInstanceOf(SQLException.class).hasMessageContaining("prvt_pst_plcy_cd");
            assertThatThrownBy(() -> s.executeUpdate(setPolicy.formatted("rcmdtn_use_yn = NULL")))
                    .as("추천 받기는 비울 수 없다").isInstanceOf(SQLException.class).hasMessageContaining("rcmdtn_use_yn");
            for (String policy : new String[] {"OPTIONAL", "REQUIRED", "NONE"}) {
                s.executeUpdate(setPolicy.formatted("prvt_pst_plcy_cd = '" + policy + "', rcmdtn_use_yn = 'N'"));
                assertThat(text(s, "SELECT prvt_pst_plcy_cd || ':' || rcmdtn_use_yn FROM tb_bbs_master WHERE bbs_id = '"
                        + LEGACY_BOARD + "'")).isEqualTo(policy + ":N");
            }
            assertThat(count(s, "SELECT count(*) FROM pg_constraint WHERE contype = 'c' AND conname IN"
                    + " ('ck_tb_bbs_master_prvt_pst_plcy_cd', 'ck_tb_bbs_master_rcmdtn_use_yn')"))
                    .as("CHECK 두 개가 하나씩 있다").isEqualTo(2);

            assertThat(text(s, "SELECT term_name || ':' || domain_name || ':' || deprecated_yn || ':'"
                    + " || coalesce(allowed_values, '-') FROM meta_standard_terms WHERE eng_abbr = 'PRVT_PST_PLCY_CD'"))
                    .isEqualTo("비공개게시물정책코드:코드C12:N:-");
            assertThat(text(s, RECOMMENDATION_TERM)).as("기존 추천사용여부 용어를 그대로 쓴다")
                    .isEqualTo(recommendationTermBefore).startsWith("추천사용여부:여부C1:N:");
            assertThat(count(s, "SELECT count(*) FROM meta_standard_terms") - termsBefore)
                    .as("용어는 PRVT_PST_PLCY_CD 한 건만 더한다").isOne();
            assertThat(text(s, "SELECT upper(data_type) || ':' || data_length FROM meta_standard_domains"
                    + " WHERE domain_name = '코드C12'")).isEqualTo("VARCHAR:12");
        }
    }

    private static final String RECOMMENDATION_TERM = "SELECT term_name || ':' || domain_name || ':' || deprecated_yn || ':'"
            + " || coalesce(allowed_values, '-') FROM meta_standard_terms WHERE eng_abbr = 'RCMDTN_USE_YN'";

    /**
     * V2_141 — 게시글의 상단 고정(upend_fix_yn·upend_fix_end_ymd)과 게시판의 고정 정책(허용·상한·기본 일수)이다(ADR-0040 결정 5·6).
     * 고정 중이면 종료일이 8자리 yyyyMMdd 로 반드시 있어야 하고(CHECK), 이미 있던 글·게시판은 고정 안 함·N·5·30 으로 시작한다.
     */
    private void addsPostPinningAndPinPolicy() throws Exception {
        long termsBefore;
        long legacyPost;
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema()"
                    + " AND ((table_name = 'tb_bbs_item' AND column_name LIKE 'upend_fix%')"
                    + " OR (table_name = 'tb_bbs_master' AND column_name LIKE 'upend_fix%'))"))
                    .as("아직 상단 고정 컬럼이 없다").isZero();
            assertThat(count(s, "SELECT count(*) FROM meta_standard_terms WHERE eng_abbr IN ('UPEND_FIX_PSBLTY_YN',"
                    + " 'UPEND_FIX_UPLMT_NOCS', 'UPEND_FIX_BSC_DAY_CNT', 'UPEND_FIX_END_YMD')"))
                    .as("V2_141 전에는 새 용어가 없다").isZero();
            termsBefore = count(s, "SELECT count(*) FROM meta_standard_terms");
            legacyPost = insertPost(s, LEGACY_BOARD);
        }

        flyway(MigrationVersion.fromVersion("2.141")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(columnShape(s, "tb_bbs_item", "upend_fix_yn")).isEqualTo("character varying:1:NO:'N'::character varying");
            assertThat(columnShape(s, "tb_bbs_item", "upend_fix_end_ymd")).isEqualTo("character varying:8:YES:-");
            assertThat(columnShape(s, "tb_bbs_master", "upend_fix_psblty_yn"))
                    .isEqualTo("character varying:1:NO:'N'::character varying");
            assertThat(numericShape(s, "upend_fix_uplmt_nocs")).isEqualTo("numeric:10:0:NO:5");
            assertThat(numericShape(s, "upend_fix_bsc_day_cnt")).isEqualTo("numeric:7:0:NO:30");

            assertThat(count(s, "SELECT count(*) FROM tb_bbs_item WHERE upend_fix_yn <> 'N' OR upend_fix_end_ymd IS NOT NULL"))
                    .as("이미 있던 글(시드 포함)은 고정 안 함으로 시작한다").isZero();
            assertThat(count(s, "SELECT count(*) FROM tb_bbs_master WHERE upend_fix_psblty_yn <> 'N'"
                    + " OR upend_fix_uplmt_nocs <> 5 OR upend_fix_bsc_day_cnt <> 30"))
                    .as("이미 있던 게시판(시드 포함)은 고정 안 받음·5건·30일로 시작한다").isZero();

            // 이 컬럼들을 모르는 이전 앱의 INSERT 도 기본값으로 채워진다(Expand 안전).
            insertBoard(s, PIN_LATER_BOARD);
            long laterPost = insertPost(s, PIN_LATER_BOARD);
            assertThat(text(s, "SELECT upend_fix_psblty_yn || ':' || upend_fix_uplmt_nocs || ':' || upend_fix_bsc_day_cnt"
                    + " FROM tb_bbs_master WHERE bbs_id = '" + PIN_LATER_BOARD + "'")).isEqualTo("N:5:30");
            assertThat(text(s, "SELECT upend_fix_yn || ':' || coalesce(upend_fix_end_ymd, '-') FROM tb_bbs_item"
                    + " WHERE pst_sn = " + laterPost)).isEqualTo("N:-");

            String pinPost = "UPDATE tb_bbs_item SET upend_fix_yn = '%s', upend_fix_end_ymd = %s WHERE pst_sn = " + legacyPost;
            assertRejected(s, pinPost.formatted("X", "'20261122'"), "ck_tb_bbs_item_upend_fix_yn");
            assertRejected(s, pinPost.formatted("Y", "NULL"), "ck_tb_bbs_item_upend_fix_end_ymd");
            // 8자리지만 숫자가 아닌 값(하이픈 형식은 열 길이 8 을 넘어 CHECK 전에 막힌다).
            assertRejected(s, pinPost.formatted("Y", "'2026-1-1'"), "ck_tb_bbs_item_upend_fix_end_ymd");
            assertRejected(s, pinPost.formatted("Y", "'2026111'"), "ck_tb_bbs_item_upend_fix_end_ymd");
            assertThatThrownBy(() -> s.executeUpdate("UPDATE tb_bbs_item SET upend_fix_yn = NULL WHERE pst_sn = " + legacyPost))
                    .as("고정 여부는 비울 수 없다").isInstanceOf(SQLException.class).hasMessageContaining("upend_fix_yn");
            s.executeUpdate(pinPost.formatted("Y", "'20261122'"));
            assertThat(text(s, "SELECT upend_fix_yn || ':' || upend_fix_end_ymd FROM tb_bbs_item WHERE pst_sn = " + legacyPost))
                    .isEqualTo("Y:20261122");
            s.executeUpdate(pinPost.formatted("N", "NULL"));

            String setPolicy = "UPDATE tb_bbs_master SET %s WHERE bbs_id = '" + LEGACY_BOARD + "'";
            assertRejected(s, setPolicy.formatted("upend_fix_psblty_yn = 'X'"), "ck_tb_bbs_master_upend_fix_psblty_yn");
            assertRejected(s, setPolicy.formatted("upend_fix_uplmt_nocs = 0"), "ck_tb_bbs_master_upend_fix_uplmt_nocs");
            assertRejected(s, setPolicy.formatted("upend_fix_bsc_day_cnt = 0"), "ck_tb_bbs_master_upend_fix_bsc_day_cnt");
            s.executeUpdate(setPolicy.formatted("upend_fix_psblty_yn = 'Y', upend_fix_uplmt_nocs = 1, upend_fix_bsc_day_cnt = 365"));
            assertThat(text(s, "SELECT upend_fix_psblty_yn || ':' || upend_fix_uplmt_nocs || ':' || upend_fix_bsc_day_cnt"
                    + " FROM tb_bbs_master WHERE bbs_id = '" + LEGACY_BOARD + "'")).isEqualTo("Y:1:365");

            for (String[] term : new String[][] {
                    {"UPEND_FIX_PSBLTY_YN", "상단고정가능여부:여부C1:N:-"},
                    {"UPEND_FIX_UPLMT_NOCS", "상단고정상한건수:수N10:N:-"},
                    {"UPEND_FIX_BSC_DAY_CNT", "상단고정기본일수:수N7:N:-"},
                    {"UPEND_FIX_END_YMD", "상단고정종료일자:연월일C8:N:-"}}) {
                assertThat(text(s, "SELECT term_name || ':' || domain_name || ':' || deprecated_yn || ':'"
                        + " || coalesce(allowed_values, '-') FROM meta_standard_terms WHERE eng_abbr = '" + term[0] + "'"))
                        .as(term[0]).isEqualTo(term[1]);
            }
            assertThat(text(s, "SELECT term_name || ':' || domain_name FROM meta_standard_terms WHERE eng_abbr = 'UPEND_FIX_YN'"))
                    .as("기존 상단고정여부 용어를 그대로 쓴다").isEqualTo("상단고정여부:여부C1");
            assertThat(count(s, "SELECT count(*) FROM meta_standard_terms") - termsBefore)
                    .as("용어는 새 복합 용어 네 건만 더한다").isEqualTo(4);
            for (String[] domain : new String[][] {{"수N10", "NUMERIC:10"}, {"수N7", "NUMERIC:7"}, {"연월일C8", "VARCHAR:8"}}) {
                assertThat(text(s, "SELECT upper(data_type) || ':' || data_length FROM meta_standard_domains"
                        + " WHERE domain_name = '" + domain[0] + "'")).as(domain[0]).isEqualTo(domain[1]);
            }
        }
    }

    private static String columnShape(Statement statement, String table, String column) throws SQLException {
        return text(statement, "SELECT data_type || ':' || coalesce(character_maximum_length::text, '-') || ':' || is_nullable"
                + " || ':' || coalesce(column_default, '-') FROM information_schema.columns WHERE table_schema = current_schema()"
                + " AND table_name = '" + table + "' AND column_name = '" + column + "'");
    }

    private static String numericShape(Statement statement, String column) throws SQLException {
        return text(statement, "SELECT data_type || ':' || numeric_precision || ':' || numeric_scale || ':' || is_nullable"
                + " || ':' || coalesce(column_default, '-') FROM information_schema.columns WHERE table_schema = current_schema()"
                + " AND table_name = 'tb_bbs_master' AND column_name = '" + column + "'");
    }

    /** 게시글 한 건을 이 컬럼들을 모르는 앱처럼 넣는다(고정 컬럼 생략). */
    private static long insertPost(Statement statement, String bbsId) throws SQLException {
        try (ResultSet result = statement.executeQuery("INSERT INTO tb_bbs_item (bbs_id, pst_ttl, use_yn, sort_ordr, ans_sn)"
                + " VALUES ('" + bbsId + "', '고정 검증', 'Y', (SELECT coalesce(max(sort_ordr), 0) + 1 FROM tb_bbs_item"
                + " WHERE bbs_id = '" + bbsId + "'), 1) RETURNING pst_sn")) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private void addsReservationSettingDefaultingToNo() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.139")));
        long termsBefore;
        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(count(s, "SELECT count(*) FROM information_schema.columns WHERE table_schema = current_schema()"
                    + " AND table_name = 'tb_bbs_master' AND column_name = 'rsvt_pstg_psblty_yn'"))
                    .as("아직 예약 게시 설정 컬럼이 없다").isZero();
            assertThat(count(s, "SELECT count(*) FROM meta_standard_terms WHERE eng_abbr = 'RSVT_PSTG_PSBLTY_YN'"))
                    .as("V2_140 전에는 새 용어가 없다").isZero();
            termsBefore = count(s, "SELECT count(*) FROM meta_standard_terms");
            insertBoard(s, LEGACY_BOARD);
        }

        flyway(MigrationVersion.fromVersion("2.140")).migrate();

        try (var c = openConnection(); var s = c.createStatement()) {
            assertThat(text(s, "SELECT data_type || ':' || character_maximum_length || ':' || is_nullable || ':'"
                    + " || coalesce(column_default, '-') FROM information_schema.columns WHERE table_schema = current_schema()"
                    + " AND table_name = 'tb_bbs_master' AND column_name = 'rsvt_pstg_psblty_yn'"))
                    .isEqualTo("character varying:1:NO:'N'::character varying");
            assertThat(count(s, "SELECT count(*) FROM tb_bbs_master WHERE rsvt_pstg_psblty_yn <> 'N'"))
                    .as("이미 있던 게시판(시드 포함)은 예약 게시를 받지 않는 N 으로 시작한다").isZero();
            assertThat(text(s, "SELECT rsvt_pstg_psblty_yn FROM tb_bbs_master WHERE bbs_id = '" + LEGACY_BOARD + "'"))
                    .isEqualTo("N");

            // 이 컬럼을 모르는 이전 앱의 INSERT 도 기본값으로 채워진다(Expand 안전).
            insertBoard(s, LATER_BOARD);
            assertThat(text(s, "SELECT rsvt_pstg_psblty_yn FROM tb_bbs_master WHERE bbs_id = '" + LATER_BOARD + "'"))
                    .isEqualTo("N");

            s.executeUpdate("UPDATE tb_bbs_master SET rsvt_pstg_psblty_yn = 'Y' WHERE bbs_id = '" + LATER_BOARD + "'");
            assertThat(text(s, "SELECT rsvt_pstg_psblty_yn FROM tb_bbs_master WHERE bbs_id = '" + LATER_BOARD + "'"))
                    .isEqualTo("Y");
            assertRejected(s, "UPDATE tb_bbs_master SET rsvt_pstg_psblty_yn = 'X' WHERE bbs_id = '" + LEGACY_BOARD + "'",
                    "ck_tb_bbs_master_rsvt_pstg_psblty_yn");
            assertRejected(s, "UPDATE tb_bbs_master SET rsvt_pstg_psblty_yn = 'y' WHERE bbs_id = '" + LEGACY_BOARD + "'",
                    "ck_tb_bbs_master_rsvt_pstg_psblty_yn");
            assertThatThrownBy(() -> s.executeUpdate(
                    "UPDATE tb_bbs_master SET rsvt_pstg_psblty_yn = NULL WHERE bbs_id = '" + LEGACY_BOARD + "'"))
                    .as("비울 수 없다").isInstanceOf(SQLException.class).hasMessageContaining("rsvt_pstg_psblty_yn");

            assertThat(text(s, "SELECT term_name || ':' || domain_name || ':' || deprecated_yn || ':'"
                    + " || coalesce(allowed_values, '-') FROM meta_standard_terms WHERE eng_abbr = 'RSVT_PSTG_PSBLTY_YN'"))
                    .isEqualTo("예약게시가능여부:여부C1:N:-");
            assertThat(count(s, "SELECT count(*) FROM meta_standard_terms") - termsBefore)
                    .as("용어는 RSVT_PSTG_PSBLTY_YN 한 건만 더한다").isOne();
            assertThat(text(s, "SELECT upper(data_type) || ':' || data_length FROM meta_standard_domains"
                    + " WHERE domain_name = '여부C1'")).isEqualTo("VARCHAR:1");
        }
    }

    private static void assertRejected(Statement statement, String sql, String constraint) {
        assertThatThrownBy(() -> statement.executeUpdate(sql))
                .as("%s 가 거부한다", constraint)
                .isInstanceOf(SQLException.class).hasMessageContaining(constraint);
    }

    private static void insertBoard(Statement statement, String bbsId) throws SQLException {
        statement.executeUpdate("INSERT INTO tb_bbs_master"
                + " (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, atch_psblty_file_qty, file_atch_psblty_yn, use_yn)"
                + " VALUES ('" + bbsId + "', '운영 설정 검증', 'BBST01', 'BBSA02', 0, 'N', 'Y')");
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
