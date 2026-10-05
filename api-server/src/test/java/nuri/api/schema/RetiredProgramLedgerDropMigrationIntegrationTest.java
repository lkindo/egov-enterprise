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
 * V2_127 이 레거시 연결 프로그램 컬럼·외래 키, 프로그램 원장, 빈 마이페이지 콘텐츠 테이블을 지우는지 본다.
 *
 * <p>[왜 필요한가] 구조를 지우는 Contract 다(ZDM-2026-0041~0043 의 증거). 빈 테이블에 행이 있으면 지우지 않고 멈춰야 하고
 * (ADR-0012 선례), 멈추면 아무것도 바뀌지 않아야 한다. 정상 적용에서는 지울 것만 지우고 메뉴의 나머지 값은 그대로여야 한다.
 *
 * <p>[왜 별도 클래스인가] V2 체인의 이력 검증이다. 투영본은 V2 체인을 V1 번들로 바꾸므로 생성기가
 * {@code *MigrationIntegrationTest} 를 제거한다.
 */
@Tag("schema-validation")
@DisplayName("V2_127 퇴역한 프로그램 원장·빈 마이페이지 콘텐츠 테이블 폐기")
class RetiredProgramLedgerDropMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final String RESOURCE =
            "db/migration/V2_127__drop_retired_program_ledger_and_personal_page_contents.sql";

    /** 지우지 않는 메뉴 컬럼의 값. */
    private static final String MENUS = "SELECT menu_sn::text || '/' || coalesce(up_menu_sn::text, '~') || '/' || menu_ordr"
            + " || '/' || menu_nm || '/' || coalesce(modern_route, '~') || '/' || coalesce(menu_expln, '~') || '/' || use_yn"
            + " FROM tb_menu_info ORDER BY menu_sn";
    private static final String STRUCTURE = "SELECT coalesce(to_regclass('public.tb_prgrm_lst')::text, '-') || '/'"
            + " || coalesce(to_regclass('public.tb_indv_pg_conts')::text, '-') || '/'"
            + " || coalesce(to_regclass('public.sq_conts_sn')::text, '-') || '/'"
            + " || (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public'"
            + "     AND table_name = 'tb_menu_info' AND column_name = 'prgrm_file_nm') || '/'"
            + " || (SELECT count(*) FROM pg_constraint WHERE conname = 'fk_tb_menu_info_tb_prgrm_lst')";

    @Test
    @DisplayName("빈 테이블에 행이 있으면 멈추고 아무것도 바꾸지 않으며, 정상 적용은 지울 것만 지운다")
    void dropsOnlyTheRetiredStructures() throws Exception {
        AuthorizationCutoverTestSupport.migrate(flyway(MigrationVersion.fromVersion("2.126")));
        String sql = new ClassPathResource(RESOURCE).getContentAsString(StandardCharsets.UTF_8);

        List<String> menusBefore;
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            // 전제: 지울 구조가 모두 있고 두 테이블은 비어 있다(OCI 와 같은 모양).
            assertThat(texts(statement, STRUCTURE)).containsExactly("tb_prgrm_lst/tb_indv_pg_conts/sq_conts_sn/1/1");
            assertThat(texts(statement, "SELECT (SELECT count(*) FROM tb_prgrm_lst) || '/' || (SELECT count(*) FROM tb_indv_pg_conts)"))
                    .containsExactly("0/0");
            menusBefore = texts(statement, MENUS);
        }

        // 가드: 빈 테이블에 행이 있으면 멈추고, 같은 트랜잭션의 어떤 변경도 남지 않는다.
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute("INSERT INTO tb_indv_pg_conts (cntnts_nm) VALUES ('V2127 guard')");
                assertThatThrownBy(() -> statement.execute(sql))
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("tb_indv_pg_conts has rows");
            } finally {
                connection.rollback();
            }
        }
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, STRUCTURE)).as("멈춘 적용은 아무것도 지우지 않는다")
                    .containsExactly("tb_prgrm_lst/tb_indv_pg_conts/sq_conts_sn/1/1");
        }

        flyway(MigrationVersion.fromVersion("2.127")).migrate();
        try (var connection = openConnection(); var statement = connection.createStatement()) {
            assertThat(texts(statement, STRUCTURE)).as("두 테이블·소유 sequence·컬럼·외래 키가 사라진다")
                    .containsExactly("-/-/-/0/0");
            assertThat(texts(statement, MENUS)).as("메뉴의 나머지 값은 그대로다").isEqualTo(menusBefore);
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
