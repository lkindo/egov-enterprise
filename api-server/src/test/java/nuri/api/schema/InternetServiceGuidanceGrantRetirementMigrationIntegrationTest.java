package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * V2_135 가 인터넷 서비스 안내(ISG) 화면·API 퇴역의 전제를 확인한 뒤 SERVICE_* 기능 권한 배정을 지우고, 지운 배정마다 변경 이력을 남기는지 본다.
 *
 * <p>[왜 필요한가] 같은 변경이 SERVICE_* 를 권한 원장에서 걷는다. 기존 DB 에 배정이 남으면 권한 스냅샷이 원장에 없는 코드를 만나 fail-closed 로
 * 실패하고, 권한 관리 화면이 그룹의 전체 배정을 저장할 때 '알 수 없는 기능 권한' 으로 거부한다. 반대로 퇴역의 전제(안내 행이 없다, 그 라우트를 가리키는
 * 메뉴가 없다, 배정이 시드가 준 두 그룹뿐이다)가 깨진 환경에서는 건너뛰지 않고 멈춰야 한다 — 쓰는 안내를 볼 길을 없애거나 기관이 따로 내린 배정을
 * 판정 없이 지우지 않는다. 경우마다 같은 SQL 을 롤백 트랜잭션에서 실행해 대조한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_135 인터넷 서비스 안내 권한 퇴역")
class InternetServiceGuidanceGrantRetirementMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE = "db/migration/V2_135__retire_internet_service_guidance_grants.sql";
    private static final String SERVICE_CODES = "('SERVICE_CREATE', 'SERVICE_DELETE', 'SERVICE_READ', 'SERVICE_UPDATE')";
    private static final String RETIRED_ROUTE = "/admin/system/isg";
    /** 콘텐츠 운영 섹션. 같은 경로를 가리키는 메뉴를 그 아래에 만든다. */
    private static final String CONTENT_SECTION = "9030000";

    /**
     * 적용 시점 권한 원장 버전의 스냅샷. {@code PermissionCodes.CATALOG_VERSION} 과 비교하지 않는다 — 그 상수는 원장이 바뀌면 따라 바뀌지만,
     * 이미 적용된 마이그레이션의 이력 값은 바뀌지 않는다(V2_134 도 리터럴이다).
     */
    private static final String POLICY_VERSION = "df0b0b15c8a02001d8b874379264b7cda47b6443d336361d755fe27d4ba35adc";
    private static final String REASON = "2026-10-19 사용자 승인: 인터넷 서비스 안내 퇴역";

    private static final String GRANTS = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd"
            + " FROM tb_authrt_grnt_map ORDER BY 1";
    private static final String SERVICE_GRANTS = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd"
            + " FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + SERVICE_CODES + " ORDER BY 1";
    private static final String HISTORY = "SELECT authrt_cd || '/' || authrt_type_cd || '/' || authrt_grnt_cd || '/'"
            + " || chg_trgt_type_cd || '/' || chg_type_cd || '/' || chg_artcl_nm || '/' || chg_bfr_cn || '/'"
            + " || coalesce(chg_aftr_cn, '-') || '/' || plcy_ver_no || '/' || frst_rgtr_id || '/' || chg_rsn"
            + " FROM tb_authrt_chg_hstry WHERE dmnd_idntfr = 'migration:2.135' ORDER BY 1";
    private static final String MENUS = "SELECT menu_sn::text || '/' || coalesce(modern_route, '-') FROM tb_menu_info ORDER BY menu_sn";

    @Test
    @DisplayName("시드가 준 두 그룹의 SERVICE_* 배정만 이력과 함께 지우고, 안내 행·그 경로의 메뉴·다른 배정이 있거나 표가 없으면 실패하며, 이미 없으면 그대로 둔다")
    void retiresOnlyTheSeededServiceGrants() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.134")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        List<String> grantsBefore;
        List<String> seeded;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인이 만든 상태(OCI 와 같은 모양). 이 배정이 없으면 아래 단언이 아무것도 증명하지 못한다.
            seeded = texts(statement, SERVICE_GRANTS);
            assertThat(seeded).as("V2_99 가 준 배정 — 두 그룹 × 네 코드")
                    .containsExactly(expectedGrants().toArray(String[]::new));
            assertThat(texts(statement, "SELECT count(*)::text FROM tb_intrn_svc")).as("안내 행이 없다").containsExactly("0");
            assertThat(texts(statement, "SELECT menu_sn::text FROM tb_menu_info WHERE modern_route LIKE '" + RETIRED_ROUTE + "%'"))
                    .as("그 경로를 가리키는 메뉴가 없다").isEmpty();
            grantsBefore = texts(statement, GRANTS);
        }

        assertRejectedWithinRollback(sql, "tb_intrn_svc has stored guidance rows",
                "INSERT INTO tb_intrn_svc (itnt_svc_nm, itnt_svc_expln, rflt_yn) VALUES ('V2_135 안내', 'V2_135 설명', 'N')");
        assertRejectedWithinRollback(sql, "a menu row points at the retired route /admin/system/isg",
                "INSERT INTO tb_menu_info (menu_nm, up_menu_sn, menu_ordr, modern_route, use_yn)"
                        + " VALUES ('V2_135 같은 경로', " + CONTENT_SECTION + ", 99, '" + RETIRED_ROUTE + "', 'N')");
        assertRejectedWithinRollback(sql, "a menu row points at the retired route /admin/system/isg",
                "INSERT INTO tb_menu_info (menu_nm, up_menu_sn, menu_ordr, modern_route, use_yn)"
                        + " VALUES ('V2_135 쿼리 경로', " + CONTENT_SECTION + ", 99, '" + RETIRED_ROUTE + "?page=2', 'Y')");
        assertRejectedWithinRollback(sql, "SERVICE_* is granted outside the ROLE_ADMIN and ROLE_SYSTEM operation grants",
                "INSERT INTO tb_authrt_grnt_map (authrt_cd, authrt_type_cd, authrt_grnt_cd, frst_rgtr_id, crt_dt)"
                        + " VALUES ('ROLE_USER', 'OPERATION', 'SERVICE_READ', 'SYSTEM', CURRENT_TIMESTAMP)");
        assertRejectedWithinRollback(sql, "table tb_intrn_svc is missing",
                "ALTER TABLE tb_intrn_svc RENAME TO tb_intrn_svc_v2135_moved");
        assertUnchangedWithinRollback(sql, "배정이 이미 없으면 아무것도 하지 않는다",
                "DELETE FROM tb_authrt_grnt_map WHERE authrt_grnt_cd IN " + SERVICE_CODES);

        flyway(MigrationVersion.fromVersion("2.135")).migrate();

        List<String> grantsAfter;
        List<String> historyAfter;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            grantsAfter = texts(statement, GRANTS);
            assertThat(texts(statement, SERVICE_GRANTS)).as("SERVICE_* 배정이 남았다").isEmpty();
            List<String> expected = new ArrayList<>(grantsBefore);
            expected.removeAll(seeded);
            assertThat(expected).as("지울 배정이 정확히 여덟 줄이다").hasSize(grantsBefore.size() - 8);
            assertThat(grantsAfter).as("SERVICE_* 배정만 빠지고 나머지는 그대로다").isEqualTo(expected);
            historyAfter = texts(statement, HISTORY);
            assertThat(historyAfter).as("지운 배정마다 REMOVE 이력 한 줄(원장 버전·사유 포함)").isEqualTo(expectedHistory());
            assertThat(texts(statement, "SELECT count(*)::text FROM tb_intrn_svc"))
                    .as("물리 테이블은 남는다(이 변경은 배정만 걷는다)").containsExactly("0");
        }

        // 이미 지운 환경에서 같은 SQL 을 다시 실행해도 아무것도 바꾸지 않고 이력도 늘지 않는다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(sql);
                assertThat(texts(statement, GRANTS)).as("다시 실행해도 배정이 그대로다").isEqualTo(grantsAfter);
                assertThat(texts(statement, HISTORY)).as("다시 실행해도 이력이 늘지 않는다").isEqualTo(historyAfter);
            } finally {
                connection.rollback();
            }
        }
    }

    /** setup 뒤 같은 SQL 이 그 사유로 실패하는지 본다. 실패한 문장은 아무것도 남기지 않는다(트랜잭션 전체를 되돌린다). */
    private void assertRejectedWithinRollback(String sql, String reason, String setup) throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(setup);
                assertThatThrownBy(() -> statement.execute(sql))
                        .as("퇴역의 전제가 깨지면 건너뛰지 않고 멈춘다(%s)", reason)
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("V2_135: " + reason);
            } finally {
                connection.rollback();
            }
        }
        // 실패한 적용은 배정·이력을 하나도 바꾸지 않는다 — 실패 뒤 다른 연결에서 본 상태가 시드 상태 그대로다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, SERVICE_GRANTS)).as("배정이 그대로다(%s)", reason)
                    .containsExactly(expectedGrants().toArray(String[]::new));
            assertThat(texts(statement, HISTORY)).as("이력이 없다(%s)", reason).isEmpty();
        }
    }

    /** setup 뒤 같은 SQL 을 실행해도 배정·메뉴·이력이 하나도 바뀌지 않는지 본다. */
    private void assertUnchangedWithinRollback(String sql, String label, String setup) throws Exception {
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute(setup);
                List<String> grants = texts(statement, GRANTS);
                List<String> menus = texts(statement, MENUS);

                statement.execute(sql);

                assertThat(texts(statement, GRANTS)).as("배정이 그대로다(%s)", label).isEqualTo(grants);
                assertThat(texts(statement, MENUS)).as("메뉴가 그대로다(%s)", label).isEqualTo(menus);
                assertThat(texts(statement, HISTORY)).as("이력이 없다(%s)", label).isEmpty();
            } finally {
                connection.rollback();
            }
        }
    }

    private static List<String> expectedGrants() {
        List<String> rows = new ArrayList<>();
        for (String group : List.of("ROLE_ADMIN", "ROLE_SYSTEM")) {
            for (String code : List.of("SERVICE_CREATE", "SERVICE_DELETE", "SERVICE_READ", "SERVICE_UPDATE")) {
                rows.add(group + "/OPERATION/" + code);
            }
        }
        return rows;
    }

    private static List<String> expectedHistory() {
        return expectedGrants().stream()
                .map(grant -> grant + "/GROUP_GRANT/REMOVE/grant/" + grant.substring(grant.lastIndexOf('/') + 1)
                        + "/-/" + POLICY_VERSION + "/SYSTEM/" + REASON)
                .toList();
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
