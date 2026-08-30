package nuri.api.schema;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Tag("schema-validation")
@DisplayName("권한 할당·역할 계층의 권한 마스터 FK")
class AuthorityReferenceFkIntegrationTest extends SharedPostgresMigrationTestSupport {

    @Test
    @DisplayName("fresh schema에서는 세 권한 FK가 검증되고 신규 고아 역할을 차단한다")
    void validatesAuthorityReferencesAndRejectsNewOrphans() throws SQLException {
        flyway(null).migrate();

        try (Connection connection = openConnection();
             Statement statement = connection.createStatement()) {
            assertThat(constraintValidated(statement, "fk_tb_user_authrt_map_tb_authrt_info")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_role_hierarchy_tb_authrt_info_higher")).isTrue();
            assertThat(constraintValidated(statement, "fk_tb_role_hierarchy_tb_authrt_info_lower")).isTrue();

            assertThat(indexExists(statement, "ix_tb_user_authrt_map_authrt_id")).isTrue();
            assertThat(indexExists(statement, "ix_tb_role_hierarchy_lower_authrt")).isTrue();

            assertThatThrownBy(() -> statement.executeUpdate("""
                    INSERT INTO tb_role_hierarchy (higher_authrt, lower_authrt, frst_rgtr_id)
                    VALUES ('ROLE_DOES_NOT_EXIST', 'ROLE_USER', 'TEST')
                    """))
                    .isInstanceOf(SQLException.class)
                    .hasMessageContaining("fk_tb_role_hierarchy_tb_authrt_info_higher");
        }
    }

    private boolean constraintValidated(Statement statement, String name) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT convalidated FROM pg_constraint WHERE conname='%s'
                """.formatted(name))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }

    private boolean indexExists(Statement statement, String name) throws SQLException {
        try (ResultSet result = statement.executeQuery("""
                SELECT EXISTS (
                    SELECT 1 FROM pg_indexes
                     WHERE schemaname='public' AND indexname='%s'
                )
                """.formatted(name))) {
            assertThat(result.next()).isTrue();
            return result.getBoolean(1);
        }
    }
}
