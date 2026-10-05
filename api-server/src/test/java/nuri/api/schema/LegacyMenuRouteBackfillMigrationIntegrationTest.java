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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * V2_126 이 경로(modern_route)가 NULL 인 메뉴에 레거시 파일명(prgrm_file_nm)으로 추정한 경로를 채우는지 본다.
 *
 * <p>[왜 필요한가] 종전 앱은 기동할 때마다 이 일을 했다(MenuService.migrateModernRoutes·inferModernRoute). 앱이 그 컬럼을
 * 매핑하지 않게 되며 같은 일을 마이그레이션이 한 번 한다. 규칙이 종전 Java 와 다르면 도입 기관의 메뉴가 경로를 잃거나
 * 다른 화면으로 간다. 그래서 16개 이름과 우선순위(먼저 맞는 것)를 그대로 대조하고(종전 MenuServiceBranchTest 의 표),
 * 관리자가 비운 경로('')·이미 있는 경로·추정할 수 없는 이름·연결 없는 메뉴는 그대로 두는지 본다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_126 레거시 파일명으로 메뉴 경로 보강")
class LegacyMenuRouteBackfillMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE = "db/migration/V2_126__backfill_menu_routes_from_legacy_program_names.sql";
    private static final String PREFIX = "V2126_";

    /** 종전 MenuService.inferModernRoute 의 표(위에서부터 처음 맞는 것). 이름 앞뒤에 다른 글자가 붙어도 부분 일치다. */
    private static final Map<String, String> INFERRED = new LinkedHashMap<>();
    static {
        INFERRED.put("EgovBoardManageList", "/admin/community/boards");
        INFERRED.put("EgovBBSMasterList", "/admin/community");
        INFERRED.put("EgovCmmCodeList", "/admin/system/common-code");
        INFERRED.put("EgovGroupList", "/admin/security/group");
        INFERRED.put("EgovRoleList", "/admin/security/role");
        INFERRED.put("EgovAuthorGroupManage", "/admin/security/authority");
        INFERRED.put("EgovQustnrManageList", "/admin/survey/manage");
        INFERRED.put("EgovQustnrTmplatList", "/admin/survey/templates");
        INFERRED.put("EgovAdbkList", "/admin/collaboration/address-book");
        INFERRED.put("EgovFaqList", "/admin/help/faq");
        INFERRED.put("EgovCnsltList", "/admin/help/qna");
        INFERRED.put("EgovMainImageList", "/admin/system/banner");
        INFERRED.put("EgovFileMngList", "/admin/system/files");
        INFERRED.put("EgovProgramList", "/admin/system/programs");
        INFERRED.put("EgovMenuCreatList", "/admin/system/menus/by-authority");
        INFERRED.put("EgovMenuList", "/admin/system/menus");
        // 우선순위: 두 이름이 함께 들어 있으면 위의 것이 이긴다.
        INFERRED.put("BBSMasterBoardManage", "/admin/community/boards");
        INFERRED.put("MenuListMenuCreat", "/admin/system/menus/by-authority");
        // 종전 Java 도 GroupList 를 AuthorGroup 보다 먼저 봤다 — 'AuthorGroupList' 는 그룹 관리로 간다(규칙을 고치지 않고 옮긴다).
        INFERRED.put("EgovAuthorGroupList", "/admin/security/group");
    }

    private static final String MENUS = "SELECT menu_sn::text || '/' || coalesce(modern_route, '~') || '/'"
            + " || coalesce(prgrm_file_nm, '~') || '/' || coalesce(last_mdfr_id, '~') FROM tb_menu_info ORDER BY menu_sn";

    @Test
    @DisplayName("NULL 경로만 종전 Java 규칙(16개 이름·우선순위)으로 채우고, 비운 경로·있는 경로·모르는 이름·연결 없음은 둔다")
    void fillsOnlyNullRoutesWithTheRetiredJavaRules() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.125")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        List<String> seededMenus;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 시드 체인에는 연결 프로그램이 있는 메뉴가 없다(OCI 와 같은 모양) — 실제 적용은 아무것도 바꾸지 않는다.
            assertThat(texts(statement, "SELECT count(*)::text FROM tb_menu_info WHERE prgrm_file_nm IS NOT NULL"))
                    .containsExactly("0");
            seededMenus = texts(statement, MENUS);
        }

        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                Map<String, Long> inferred = new LinkedHashMap<>();
                for (String name : INFERRED.keySet()) {
                    inferred.put(name, insertMenu(statement, PREFIX + name, null, "infer " + name));
                }
                long unknown = insertMenu(statement, PREFIX + "LegacyQuestion", null, "unknown");
                long lowerCase = insertMenu(statement, PREFIX + "egovboardmanagelist", null, "case");
                long cleared = insertMenu(statement, PREFIX + "ClearedBoardManage", "", "cleared");
                long routed = insertMenu(statement, PREFIX + "RoutedBoardManage", "/admin/work-hub", "routed");
                long unlinked = insertMenu(statement, null, null, "unlinked");
                List<String> untouchedBefore = rows(statement, unknown, lowerCase, cleared, routed, unlinked);

                statement.execute(sql);

                for (var entry : INFERRED.entrySet()) {
                    assertThat(row(statement, inferred.get(entry.getKey())))
                            .as("%s 는 %s 로 채운다", entry.getKey(), entry.getValue())
                            .isEqualTo(inferred.get(entry.getKey()) + "/" + entry.getValue() + "/" + PREFIX + entry.getKey()
                                    + "/SYSTEM");
                }
                assertThat(rows(statement, unknown, lowerCase, cleared, routed, unlinked))
                        .as("모르는 이름(대소문자 구분)·관리자가 비운 경로·이미 있는 경로·연결 없음은 그대로다")
                        .isEqualTo(untouchedBefore);
                assertThat(texts(statement, MENUS)).as("시드 메뉴는 그대로다")
                        .containsAll(seededMenus);

                List<String> afterFirst = texts(statement, MENUS);
                statement.execute(sql);
                assertThat(texts(statement, MENUS)).as("다시 실행해도 바뀌지 않는다").isEqualTo(afterFirst);
            } finally {
                connection.rollback();
            }
        }

        flyway(MigrationVersion.fromVersion("2.126")).migrate();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, MENUS)).as("시드 체인에서는 채울 행이 없다").isEqualTo(seededMenus);
        }
    }

    /** 연결 프로그램 원장 행(외래 키)을 함께 넣고 메뉴를 만든다. 경로·파일명은 null 일 수 있다. */
    private static long insertMenu(Statement statement, String programFileName, String modernRoute, String name)
            throws SQLException {
        if (programFileName != null) {
            statement.execute("INSERT INTO tb_prgrm_lst (prgrm_file_nm) VALUES ('" + programFileName + "')");
        }
        try (ResultSet result = statement.executeQuery("INSERT INTO tb_menu_info"
                + " (menu_nm, menu_ordr, modern_route, prgrm_file_nm, frst_rgtr_id, last_mdfr_id)"
                + " VALUES ('" + PREFIX + name + "', 1, " + literal(modernRoute) + ", " + literal(programFileName)
                + ", 'fixture', 'fixture') RETURNING menu_sn")) {
            result.next();
            return result.getLong(1);
        }
    }

    private static String literal(String value) {
        return value == null ? "NULL" : "'" + value + "'";
    }

    private static String row(Statement statement, long menuSn) throws SQLException {
        return texts(statement, "SELECT menu_sn::text || '/' || coalesce(modern_route, '~') || '/'"
                + " || coalesce(prgrm_file_nm, '~') || '/' || coalesce(last_mdfr_id, '~') FROM tb_menu_info"
                + " WHERE menu_sn = " + menuSn).get(0);
    }

    private static List<String> rows(Statement statement, long... menuSns) throws SQLException {
        List<String> values = new ArrayList<>();
        for (long menuSn : menuSns) values.add(row(statement, menuSn));
        return values;
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
