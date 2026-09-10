package nuri.api.schema;

import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("권한 Contract 배포 배리어와 무손실 사전 검사·원자적 rollback")
class AuthorizationContractIntegrationTest extends SharedPostgresMigrationTestSupport {
    @Test
    void refusesMissingEvidenceDriftAndUnexpectedDependencyBeforeAtomicCutover() throws Exception {
        flyway(null).migrate();
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            assertThatThrownBy(() -> AuthorizationCutoverTestSupport.execute(connection))
                    .isInstanceOf(SQLException.class).hasMessageContaining("requires approved evidence");
            assertLegacyTablesRemain(statement);
            AuthorizationCutoverTestSupport.configureEvidence(connection);

            connection.setAutoCommit(false);
            statement.executeUpdate("UPDATE tb_user_authrt_map SET last_mdfr_id='DRIFT_TEST'");
            assertThatThrownBy(() -> AuthorizationCutoverTestSupport.execute(connection))
                    .isInstanceOf(SQLException.class).hasMessageContaining("membership drift");
            connection.rollback();
            connection.setAutoCommit(true);
            assertLegacyTablesRemain(statement);

            connection.setAutoCommit(false);
            statement.executeUpdate("UPDATE tb_role_info SET role_nm='전환 이후 변경'");
            assertThatThrownBy(() -> AuthorizationCutoverTestSupport.execute(connection))
                    .isInstanceOf(SQLException.class).hasMessageContaining("Legacy policy changed");
            connection.rollback();
            connection.setAutoCommit(true);
            assertLegacyTablesRemain(statement);

            connection.setAutoCommit(false);
            statement.executeUpdate("UPDATE tb_prgrm_lst SET url='/changed/**' WHERE prgrm_file_nm='ADMIN_ALL'");
            assertThatThrownBy(() -> AuthorizationCutoverTestSupport.execute(connection))
                    .isInstanceOf(SQLException.class).hasMessageContaining("Legacy program URL changed");
            connection.rollback();
            connection.setAutoCommit(true);
            assertLegacyTablesRemain(statement);

            statement.execute("CREATE TABLE cutover_dependency_probe(role_id varchar(50) REFERENCES tb_role_info(role_id))");
            // DROP 도중 마지막 테이블의 외부 FK가 발견되어도 앞서 DROP한 표가 복구되어야 한다.
            assertThatThrownBy(() -> AuthorizationCutoverTestSupport.execute(connection))
                    .isInstanceOf(SQLException.class).hasMessageContaining("depend");
            assertLegacyTablesRemain(statement);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract'")).isZero();
            statement.execute("DROP TABLE cutover_dependency_probe");

            try (Connection locker = openConnection(); Statement lockingStatement = locker.createStatement()) {
                locker.setAutoCommit(false);
                lockingStatement.execute("LOCK TABLE tb_menu_info IN ACCESS EXCLUSIVE MODE");
                assertThatThrownBy(() -> AuthorizationCutoverTestSupport.execute(connection))
                        .isInstanceOf(SQLException.class).hasMessageContaining("lock");
                locker.rollback();
            }
            assertLegacyTablesRemain(statement);

            long members = number(statement,"SELECT count(*) FROM tb_authrt_user_map");
            long grants = number(statement,"SELECT count(*) FROM tb_authrt_grnt_map");
            AuthorizationCutoverTestSupport.execute(connection);
            assertThat(number(statement,legacyTableCount())).isZero();
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_user_map")).isEqualTo(members);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_grnt_map")).isEqualTo(grants);
            assertThat(number(statement,"SELECT count(*) FROM tb_authrt_chg_hstry WHERE chg_artcl_nm='legacy_authorization_contract'")).isEqualTo(1);
            assertThat(number(statement,"SELECT count(*) FROM pg_constraint WHERE conrelid IN "
                    + "('tb_authrt_user_map'::regclass,'tb_authrt_grnt_map'::regclass) AND contype='f' AND convalidated")).isEqualTo(3);
            assertThat(number(statement,"SELECT count(*) FROM information_schema.tables WHERE table_schema='public' "
                    + "AND table_name IN ('tb_authrt_info','tb_authrt_user_map','tb_authrt_grnt_map','tb_authrt_chg_hstry')")).isEqualTo(4);
        }
    }

    private static void assertLegacyTablesRemain(Statement statement) throws SQLException {
        assertThat(number(statement,legacyTableCount())).isEqualTo(6);
    }

    private static String legacyTableCount() {
        return "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN "
                + "('tb_user_authrt_map','tb_authrt_role_map','tb_menu_crt_dtl','tb_role_prgrm_map','tb_role_hierarchy','tb_role_info')";
    }

    private static long number(Statement statement,String sql) throws SQLException {
        try (var result=statement.executeQuery(sql)) {
            assertThat(result.next()).isTrue();
            return result.getLong(1);
        }
    }
}
