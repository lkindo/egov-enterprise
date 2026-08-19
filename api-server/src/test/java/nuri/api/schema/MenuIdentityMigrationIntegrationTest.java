package nuri.api.schema;

import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@DisplayName("메뉴 BIGINT 수동 PK → IDENTITY 생성전략 보정")
class MenuIdentityMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final long LEGACY_ROOT_SN = 800_000_000L;

    @Test
    @DisplayName("기존 계층·권한을 보존하고 레거시 ROOT 정리 후 충돌 없는 번호를 자동 발급한다")
    void addsIdentityAndPreservesMenuRelationships() throws SQLException {
        flyway(MigrationVersion.fromVersion("2.75")).migrate();

        long menuCountBefore;
        long authorityCountBefore;
        long maxBusinessMenuSn;
        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            menuCountBefore = singleLong(statement, "SELECT count(*) FROM tb_menu_info");
            authorityCountBefore = singleLong(statement, "SELECT count(*) FROM tb_menu_crt_dtl");
            maxBusinessMenuSn = singleLong(statement,
                    "SELECT max(menu_sn) FROM tb_menu_info WHERE menu_sn <> 800000000");

            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info WHERE menu_sn=800000000 AND menu_nm='ROOT'"))
                    .isEqualTo(1L);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info WHERE up_menu_sn=800000000"))
                    .isZero();
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_crt_dtl WHERE menu_sn=800000000"))
                    .isEqualTo(1L);
        }

        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_menu_info"))
                    .isEqualTo(menuCountBefore - 1);
            assertThat(singleLong(statement, "SELECT count(*) FROM tb_menu_crt_dtl"))
                    .isEqualTo(authorityCountBefore - 1);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info WHERE menu_sn=800000000"))
                    .isZero();
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_crt_dtl WHERE menu_sn=800000000"))
                    .isZero();

            assertThat(columnDataType(statement, "tb_menu_info", "menu_sn")).isEqualTo("bigint");
            assertThat(identityGeneration(statement, "tb_menu_info", "menu_sn")).isEqualTo("BY DEFAULT");
            assertThat(serialSequence(statement, "tb_menu_info", "menu_sn"))
                    .isEqualTo("public.sq_menu_sn");
            assertThat(primaryKeyColumn(statement, "tb_menu_info")).isEqualTo("menu_sn");
            assertThat(standardTermDomain(statement, "MENU_SN")).isEqualTo("일련번호N19");
            assertThat(standardTermDomain(statement, "UP_MENU_SN")).isEqualTo("일련번호N19");

            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_info WHERE menu_sn=9040400 "
                            + "AND up_menu_sn=9040000 AND modern_route='/admin/system/audit'"))
                    .isEqualTo(1L);
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_crt_dtl WHERE menu_sn=9040400 AND authrt_cd='ROLE_ADMIN'"))
                    .isEqualTo(1L);

            long generatedParentSn;
            try (ResultSet inserted = statement.executeQuery("""
                    INSERT INTO tb_menu_info (menu_nm, menu_ordr, modern_route)
                    VALUES ('자동 생성 부모', 901, '/generated-parent')
                    RETURNING menu_sn
                    """)) {
                assertThat(inserted.next()).isTrue();
                generatedParentSn = inserted.getLong(1);
            }
            assertThat(generatedParentSn).isGreaterThan(maxBusinessMenuSn);
            assertThat(generatedParentSn).isNotEqualTo(LEGACY_ROOT_SN);

            long generatedChildSn;
            try (ResultSet inserted = statement.executeQuery("""
                    INSERT INTO tb_menu_info (menu_nm, menu_ordr, up_menu_sn, modern_route)
                    VALUES ('자동 생성 자식', 1, %d, '/generated-child')
                    RETURNING menu_sn
                    """.formatted(generatedParentSn))) {
                assertThat(inserted.next()).isTrue();
                generatedChildSn = inserted.getLong(1);
            }
            assertThat(generatedChildSn).isGreaterThan(generatedParentSn);
            assertThat(singleLong(statement,
                    "SELECT up_menu_sn FROM tb_menu_info WHERE menu_sn=" + generatedChildSn))
                    .isEqualTo(generatedParentSn);

            statement.executeUpdate("""
                    INSERT INTO tb_menu_crt_dtl (menu_sn, authrt_cd, mapng_crt_id)
                    VALUES (%d, 'ROLE_ADMIN', 'migration-test')
                    """.formatted(generatedChildSn));
            assertThat(singleLong(statement,
                    "SELECT count(*) FROM tb_menu_crt_dtl WHERE menu_sn=" + generatedChildSn))
                    .isEqualTo(1L);
        }
    }

    private long singleLong(Statement statement, String sql) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }

    private String columnDataType(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT data_type FROM information_schema.columns
                WHERE table_schema='public' AND table_name='%s' AND column_name='%s'
                """.formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private String identityGeneration(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT identity_generation FROM information_schema.columns
                WHERE table_schema='public' AND table_name='%s' AND column_name='%s'
                """.formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private String serialSequence(Statement statement, String tableName, String columnName) throws SQLException {
        try (ResultSet result = statement.executeQuery(
                "SELECT pg_get_serial_sequence('%s', '%s')".formatted(tableName, columnName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private String primaryKeyColumn(Statement statement, String tableName) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT a.attname
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                JOIN unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON true
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
                WHERE n.nspname='public' AND t.relname='%s' AND c.contype='p'
                ORDER BY k.ord
                """.formatted(tableName))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }

    private String standardTermDomain(Statement statement, String abbreviation) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT domain_name FROM meta_standard_terms WHERE eng_abbr='%s'
                """.formatted(abbreviation))) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
