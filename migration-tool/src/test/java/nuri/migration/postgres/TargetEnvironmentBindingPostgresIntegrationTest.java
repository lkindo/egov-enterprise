package nuri.migration.postgres;

import nuri.migration.artifact.TargetEndpointBinding;
import nuri.migration.model.MappingSpec;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.*;

@Testcontainers
class TargetEnvironmentBindingPostgresIntegrationTest {
    @Container static final PostgreSQLContainer<?> FIRST = new PostgreSQLContainer<>("postgres:17-alpine");
    @Container static final PostgreSQLContainer<?> SECOND = new PostgreSQLContainer<>("postgres:17-alpine");
    private final PostgresTargetSchemaFingerprinter fingerprints = new PostgresTargetSchemaFingerprinter();

    @Test
    void identicalSchemaAndLabelOnDifferentInstancesHaveDifferentApprovalDigests() throws Exception {
        try (Connection first = open(FIRST); Connection second = open(SECOND)) {
            for (Connection connection : List.of(first, second)) {
                connection.createStatement().execute("CREATE TABLE public.binding_probe (id bigint PRIMARY KEY)");
            }
            MappingSpec mapping = mapping(config(FIRST), "public.binding_probe");
            assertThat(fingerprints.fingerprint(first, mapping).digest())
                    .isEqualTo(fingerprints.fingerprint(second, mapping).digest());
            assertThat(fingerprints.fingerprintBound(first, mapping, Set.of("public")).digest())
                    .isNotEqualTo(fingerprints.fingerprintBound(second, mapping, Set.of("public")).digest());
            assertThat(fingerprints.fingerprintBound(first, mapping, Set.of("public")).digest())
                    .isNotEqualTo(fingerprints.fingerprintBound(first, mapping, Set.of("public", "other")).digest());
        }
    }

    @Test
    void credentialRotationPreservesBindingButLocationChangeRequiresNewApproval() throws Exception {
        try (Connection connection = open(FIRST)) {
            var original = config(FIRST);
            String digest = TargetEndpointBinding.capture(connection, original);
            var rotated = new MappingSpec.DbConfig(original.url(), "rotated-user", "rotated-password",
                    original.driver(), original.endpointId());
            assertThat(TargetEndpointBinding.capture(connection, rotated)).isEqualTo(digest);
            assertThat(TargetEndpointBinding.capture(connection, config(SECOND))).isNotEqualTo(digest);
            assertThat(digest).matches("[0-9a-f]{64}");
        }
    }

    @Test
    void unqualifiedUnapprovedAndControlSchemasAreRejectedBeforeMetadataAccess() {
        for (String target : List.of("binding_probe", "other.binding_probe", "pg_catalog.pg_class",
                "migration_control.tb_migration_run")) {
            assertThatThrownBy(() -> fingerprints.fingerprintBound(null,
                    mapping(config(FIRST), target), Set.of("public")))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("allowlisted");
        }
        assertThatThrownBy(() -> fingerprints.fingerprintBound(null,
                mapping(config(FIRST), "migration_control.tb_migration_run"), Set.of("migration_control")))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("allowlist");
    }

    @Test
    void missingIdentityPrivilegeFailsClosed() throws Exception {
        try (Connection connection = open(FIRST); var statement = connection.createStatement()) {
            statement.execute("CREATE ROLE binding_reader");
            statement.execute("REVOKE EXECUTE ON FUNCTION pg_catalog.pg_control_system() FROM PUBLIC");
            statement.execute("SET ROLE binding_reader");
            assertThatThrownBy(() -> TargetEndpointBinding.capture(connection, config(FIRST)))
                    .isInstanceOf(java.sql.SQLException.class);
        }
    }

    private static Connection open(PostgreSQLContainer<?> container) throws Exception {
        return DriverManager.getConnection(container.getJdbcUrl(), container.getUsername(), container.getPassword());
    }
    private static MappingSpec.DbConfig config(PostgreSQLContainer<?> container) {
        return new MappingSpec.DbConfig(container.getJdbcUrl(), container.getUsername(), container.getPassword(),
                "org.postgresql.Driver", "same-reviewed-label");
    }
    private static MappingSpec mapping(MappingSpec.DbConfig target, String table) {
        return new MappingSpec(null, target, List.of(new MappingSpec.TableMapping("legacy", table, null,
                List.of(new MappingSpec.ColumnMapping("id", "id", null, null, null, null, null)), null)), Map.of());
    }
}
