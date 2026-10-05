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
 * V2_124 가 퇴역한 프로그램 목록의 기능 권한 배정을 지우고 지운 만큼 변경 이력을 남기는지, 그리고 프로그램 원장 URL 로만
 * 경로를 얻던 말단 메뉴가 있으면 아무것도 바꾸지 않고 멈추는지 본다.
 *
 * <p>[왜 필요한가] 권한 코드 PROGRAM_* 는 원장에서 걷혔다. 기존 DB 에 배정이 남으면 권한 스냅샷이 원장에 없는 코드를 만나
 * fail-closed 로 실패하고, 권한 관리 화면이 그룹의 전체 배정을 저장할 때 '알 수 없는 기능 권한' 으로 거부한다.
 * 또 앱은 기동 때 경로 없는 메뉴를 채우며 더 이상 원장 URL 의 레거시 접두로 추정하지 않는다. 파일명으로도 추정되지 않는
 * 사용 중 말단 메뉴는 경로를 얻을 길이 없어지므로 가드가 그런 DB 를 조용히 통과시키면 안 된다(V2_95 선례).
 * 반대로 잃는 것이 없는 메뉴(경로 있음·사용 안 함·하위 있음·파일명으로 추정됨·원장 URL 이 레거시 접두가 아님)로
 * 배포를 막아서도 안 된다 — 복구 뒤 적용이 성공하는 것이 그 증거다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_124 프로그램 목록 권한 배정 퇴역")
class ProgramGrantRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String PROGRAM_CODES =
            "('PROGRAM_CREATE', 'PROGRAM_DELETE', 'PROGRAM_READ', 'PROGRAM_UPDATE')";
    /** 원장 URL 이 걷은 추정의 레거시 접두(/uss/olh/qna/)를 가진다 — 파일명으로는 추정되지 않는다. */
    private static final String LEGACY_PROGRAM = "ORG_LEGACY_PROGRAM";
    /** 원장 URL 이 레거시 접두가 아니다 — 종전에도 기동 때 경로를 얻지 못했으므로 잃는 것이 없다. */
    private static final String OTHER_URL_PROGRAM = "ORG_OTHER_PROGRAM";
    /** 파일명에 FaqList 가 있다 — 앱이 계속 파일명으로 경로를 추정한다. */
    private static final String NAME_INFERRED_PROGRAM = "ORG_FaqList_PROGRAM";

    @Test
    @DisplayName("갈 곳을 잃는 말단 메뉴가 있으면 멈추고, 경로를 채우면 두 그룹의 프로그램 배정을 지우고 행마다 REMOVE 이력을 남긴다")
    void stopsOnStrandedLeafThenRemovesProgramGrantsAndAuditsEachRow() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.123")));

        long before;
        long stranded;
        long auditsBefore;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 종전 반복 시드가 두 그룹에 넣던 배정을 재현한다. V2_99 가 이미 넣은 행은 건너뛴다.
            statement.executeUpdate("INSERT INTO tb_authrt_grnt_map"
                    + " (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt)"
                    + " SELECT g.authrt_cd, 'OPERATION', c.code, 'SYSTEM', CURRENT_TIMESTAMP, 'SYSTEM', CURRENT_TIMESTAMP"
                    + " FROM (VALUES ('ROLE_ADMIN'), ('ROLE_SYSTEM')) g(authrt_cd)"
                    + " CROSS JOIN (VALUES ('PROGRAM_CREATE'), ('PROGRAM_DELETE'), ('PROGRAM_READ'), ('PROGRAM_UPDATE')) c(code)"
                    + " WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_grnt_map m WHERE m.authrt_cd = g.authrt_cd"
                    + " AND m.authrt_type_cd = 'OPERATION' AND m.authrt_grnt_cd = c.code)");
            before = count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + PROGRAM_CODES);
            assertThat(before).as("두 그룹 × 네 코드").isEqualTo(8);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_cd = 'ROLE_ADMIN' AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd = 'MENU_READ'"))
                    .as("대조군 배정").isEqualTo(1);

            // 레거시 데이터 경로(SQL·이관)로 남은 프로그램 연결. 아래 다섯 메뉴는 경로를 잃지 않으므로 가드가 막지 않는다.
            statement.executeUpdate("INSERT INTO tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url) VALUES"
                    + " ('" + LEGACY_PROGRAM + "', '기관 레거시 프로그램', '/uss/olh/qna/selectQnaList.do'),"
                    + " ('" + OTHER_URL_PROGRAM + "', '기관 다른 프로그램', '/org/legacy.do'),"
                    + " ('" + NAME_INFERRED_PROGRAM + "', '기관 FAQ 프로그램', '/uss/olh/faq/selectFaqList.do')");
            long folder = insertMenu(statement, "V2_124 폴더", null, "NULL", "'Y'", LEGACY_PROGRAM);
            insertMenu(statement, "V2_124 폴더 하위", folder, "'/admin/help'", "'Y'", null);
            insertMenu(statement, "V2_124 경로 있는 말단", null, "'/admin/help'", "'Y'", LEGACY_PROGRAM);
            insertMenu(statement, "V2_124 사용 안 하는 말단", null, "NULL", "'N'", LEGACY_PROGRAM);
            insertMenu(statement, "V2_124 레거시 접두가 아닌 말단", null, "NULL", "'Y'", OTHER_URL_PROGRAM);
            insertMenu(statement, "V2_124 파일명으로 추정되는 말단", null, "NULL", "'Y'", NAME_INFERRED_PROGRAM);
            // 경로가 빈 문자열인 사용 중 말단 — 종전에는 기동 때 원장 URL 의 레거시 접두로만 경로를 얻었다.
            stranded = insertMenu(statement, "V2_124 갈 곳 잃는 말단", null, "'  '", "'Y'", LEGACY_PROGRAM);
            auditsBefore = count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry");
        }

        assertThatThrownBy(() -> flyway(null).migrate())
                .as("원장 URL 로만 경로를 얻던 말단 메뉴가 있으면 멈추고, 그 메뉴만 밝힌다")
                .hasStackTraceContaining("retired program URL")
                .hasStackTraceContaining(stranded + ":" + LEGACY_PROGRAM)
                .satisfies(error -> assertThat(stackTrace(error))
                        .doesNotContain(OTHER_URL_PROGRAM).doesNotContain(NAME_INFERRED_PROGRAM));

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + PROGRAM_CODES))
                    .as("멈추면 배정을 하나도 지우지 않는다").isEqualTo(before);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry")).isEqualTo(auditsBefore);
            assertThat(count(statement, "SELECT count(*) FROM flyway_schema_history WHERE version = '2.124' AND success"))
                    .isZero();
            // 복구 절차: 메뉴에 화면 경로를 넣고 다시 배포한다.
            assertThat(statement.executeUpdate("UPDATE tb_menu_info SET modern_route = '/admin/help' WHERE menu_sn = " + stranded))
                    .isEqualTo(1);
        }

        // 잃는 것이 없는 다섯 메뉴는 그대로 둔 채 적용된다 — 가드가 넓어지면 여기서 멈춘다.
        flyway(null).migrate();

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + PROGRAM_CODES))
                    .as("프로그램 배정이 남았다").isZero();
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry"
                    + " WHERE dmnd_idntfr = 'migration:2.124' AND chg_type_cd = 'REMOVE' AND chg_trgt_type_cd = 'GROUP_GRANT'"
                    + " AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd IN " + PROGRAM_CODES
                    + " AND authrt_cd IN ('ROLE_ADMIN', 'ROLE_SYSTEM')"
                    + " AND plcy_ver_no ~ '^[a-f0-9]{64}$' AND chg_rsn LIKE '%프로그램 목록 퇴역'"))
                    .as("지운 행마다 이력 한 줄").isEqualTo(before);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_chg_hstry")).isEqualTo(auditsBefore + before);
            assertThat(count(statement, "SELECT count(*) FROM tb_authrt_grnt_map"
                    + " WHERE authrt_cd = 'ROLE_ADMIN' AND authrt_type_cd = 'OPERATION' AND authrt_grnt_cd = 'MENU_READ'"))
                    .as("다른 기능 권한은 그대로다").isEqualTo(1);
            assertThat(count(statement, "SELECT count(*) FROM tb_menu_info WHERE prgrm_file_nm IN ('" + LEGACY_PROGRAM
                    + "', '" + OTHER_URL_PROGRAM + "', '" + NAME_INFERRED_PROGRAM + "')"))
                    .as("메뉴의 레거시 연결과 원장은 지우지 않는다(다음 릴리스의 별도 승인)").isEqualTo(6);
            assertThat(count(statement, "SELECT count(*) FROM tb_prgrm_lst WHERE prgrm_file_nm IN ('" + LEGACY_PROGRAM
                    + "', '" + OTHER_URL_PROGRAM + "', '" + NAME_INFERRED_PROGRAM + "')"))
                    .isEqualTo(3);
        }
    }

    private static long insertMenu(Statement statement, String name, Long parent, String route, String useYn,
            String program) throws SQLException {
        try (ResultSet result = statement.executeQuery("INSERT INTO tb_menu_info"
                + " (menu_nm, up_menu_sn, menu_ordr, modern_route, use_yn, prgrm_file_nm)"
                + " VALUES ('" + name + "', " + (parent == null ? "NULL" : parent) + ", 990, " + route + ", " + useYn
                + ", " + (program == null ? "NULL" : "'" + program + "'") + ") RETURNING menu_sn")) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private static String stackTrace(Throwable error) {
        java.io.StringWriter writer = new java.io.StringWriter();
        error.printStackTrace(new java.io.PrintWriter(writer));
        return writer.toString();
    }

    private long count(Statement statement, String query) throws SQLException {
        try (ResultSet result = statement.executeQuery(query)) {
            assertThat(result.next()).as("질의가 행을 돌려주지 않았다: %s", query).isTrue();
            return result.getLong(1);
        }
    }
}
