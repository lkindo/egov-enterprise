package nuri.api.schema;

import nuri.business.domain.program.ProgramRepository;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.data.jpa.repository.Query;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Tag("schema-validation")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("메뉴 IDENTITY 및 자동 Program 준비 PostgreSQL 계약")
class MenuIdentityMigrationIntegrationTest extends SharedPostgresMigrationTestSupport {

    private static final long LEGACY_ROOT_SN = 800_000_000L;

    @Test
    @Order(1)
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

    @Test
    @Order(2)
    @DisplayName("같은 Program을 동시에 최초 준비해도 PK 충돌 없이 한 행만 생성한다")
    void concurrentProgramProvisioningIsAtomic() throws Exception {
        flyway(null).migrate();

        var method = ProgramRepository.class.getMethod(
                "insertIfAbsent", String.class, String.class, String.class, String.class, String.class);
        Query query = method.getAnnotation(Query.class);
        assertThat(query).isNotNull();
        assertThat(query.nativeQuery()).isTrue();
        assertThat(query.value()).contains("ON CONFLICT ON CONSTRAINT pk_tb_prgrm_lst DO NOTHING");

        String jdbcSql = query.value()
                .replace(":prgrmFileNm", "?")
                .replace(":prgrmKornNm", "?")
                .replace(":url", "?")
                .replace(":prgrmStrgPath", "?")
                .replace(":auditActor", "?");
        String programFileName = "E2E_CONCURRENT_PROGRAM";

        try (Connection connection = openConnection();
             PreparedStatement delete = connection.prepareStatement(
                     "DELETE FROM tb_prgrm_lst WHERE prgrm_file_nm = ?")) {
            delete.setString(1, programFileName);
            delete.executeUpdate();
        }

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            Future<Integer> first = executor.submit(() -> insertProgram(jdbcSql, programFileName, ready, start));
            Future<Integer> second = executor.submit(() -> insertProgram(jdbcSql, programFileName, ready, start));

            boolean bothReady = ready.await(10, TimeUnit.SECONDS);
            start.countDown();
            assertThat(bothReady).as("두 독립 transaction이 동시에 insert를 시작할 준비").isTrue();

            assertThat(List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(0, 1);
        } finally {
            start.countDown();
            executor.shutdownNow();
        }

        try (Connection connection = openConnection();
             PreparedStatement select = connection.prepareStatement("""
                     SELECT frst_rgtr_id, last_mdfr_id
                       FROM tb_prgrm_lst
                      WHERE prgrm_file_nm = ?
                     """)) {
            select.setString(1, programFileName);
            try (ResultSet result = select.executeQuery()) {
                assertThat(result.next()).isTrue();
                assertThat(result.getString(1)).isEqualTo("admin");
                assertThat(result.getString(2)).isEqualTo("admin");
                assertThat(result.next()).isFalse();
            }
        }
    }

    private int insertProgram(String sql, String programFileName,
            CountDownLatch ready, CountDownLatch start) throws Exception {
        try (Connection connection = openConnection();
             PreparedStatement insert = connection.prepareStatement(sql)) {
            connection.setAutoCommit(false);
            insert.setString(1, programFileName);
            insert.setString(2, "동시 생성 프로그램");
            insert.setString(3, "/e2e/concurrent-program");
            insert.setString(4, "/auto-generated");
            insert.setString(5, "admin");
            insert.setString(6, "admin");
            ready.countDown();
            if (!start.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("동시 insert 시작 신호를 기다리는 중 timeout");
            }
            int inserted = insert.executeUpdate();
            connection.commit();
            return inserted;
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
