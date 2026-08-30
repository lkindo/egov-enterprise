package nuri.migration.artifact;

import nuri.migration.discovery.CatalogSnapshot;
import nuri.migration.discovery.DiscoveryRequest;
import nuri.migration.discovery.DiscoveryScope;
import nuri.migration.discovery.SnapshotCapability;
import nuri.migration.model.MappingSpec.DbConfig;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CatalogInventoryEndpointBindingTest {

    private final CatalogSnapshotArtifactCodec codec = new CatalogSnapshotArtifactCodec();
    private final SourceDriverEvidence driverEvidence =
            SourceDriverEvidence.bundled("org.postgresql.Driver");
    private final DiscoveryScope scope = DiscoveryScope.capture(
            "postgresql-pg-catalog",
            new DiscoveryRequest(Set.of(), Set.of("app"), Set.of(), false),
            Set.of(),
            Set.of());

    @Test
    void bindsTheExactDiscoverySourceEndpointWithoutPersistingItsRawValue() {
        DbConfig endpoint = endpoint(
                "jdbc:postgresql://authority-user-sentinel:authority-password-sentinel@"
                        + "url-host-sentinel/source-db-sentinel?user=query-user-sentinel"
                        + "&password=query-password-sentinel&sslmode=require",
                "config-user-sentinel",
                "config-password-sentinel");

        String artifact = codec.write(snapshot(), driverEvidence, scope, endpoint);
        CatalogSnapshotArtifactEnvelope envelope = codec.readEnvelope(artifact);

        assertThat(envelope.sourceEndpointBinding().bound()).isTrue();
        assertThat(envelope.sourceEndpointBinding().matches(endpoint)).isTrue();
        assertThat(envelope.sourceEndpointBinding().matches(new DbConfig(
                endpoint.url(), endpoint.username(), endpoint.password(), endpoint.driver(),
                "other-source-endpoint"))).isFalse();
        assertThat(artifact)
                .doesNotContain(endpoint.url(), endpoint.username(), endpoint.password(),
                        endpoint.driver(), endpoint.endpointId(),
                        "authority-user-sentinel", "authority-password-sentinel",
                        "query-user-sentinel", "query-password-sentinel");
        assertThat(envelope.sourceEndpointBinding().toString())
                .doesNotContain("sentinel", endpoint.url(), endpoint.endpointId());
        assertThatThrownBy(() -> SourceEndpointBinding.capture(new DbConfig(
                " " + endpoint.url(), endpoint.username(), endpoint.password(),
                endpoint.driver(), endpoint.endpointId())))
                .hasMessageNotContaining("sentinel")
                .hasMessageNotContaining(endpoint.url())
                .hasMessageNotContaining(endpoint.username())
                .hasMessageNotContaining(endpoint.password())
                .hasMessageNotContaining(endpoint.driver())
                .hasMessageNotContaining(endpoint.endpointId());
    }

    @Test
    void credentialOnlyChangesPreserveEndpointIdentityAcrossCommonJdbcUrlForms() {
        assertSameEndpoint(
                endpoint("jdbc:postgresql://alice:alpha@db.example:5432/app"
                        + "?user=alice&password=alpha&sslmode=require", "alice", "alpha"),
                endpoint("jdbc:postgresql://bob:beta@db.example:5432/app"
                        + "?user=bob&password=beta&sslmode=require", "bob", "beta"));
        assertSameEndpoint(
                endpoint("jdbc:h2:tcp://db.example/app;USER=alice;PASSWORD=alpha;MODE=PostgreSQL",
                        "alice", "alpha"),
                endpoint("jdbc:h2:tcp://db.example/app;USER=bob;PASSWORD=beta;MODE=PostgreSQL",
                        "bob", "beta"));
        assertSameEndpoint(
                endpoint("jdbc:sqlserver://db.example:1433;databaseName=app;user=alice;"
                                + "password={alpha;one};encrypt=true", "alice", "alpha;one"),
                endpoint("jdbc:sqlserver://db.example:1433;databaseName=app;user=bob;"
                                + "password={beta;two};encrypt=true", "bob", "beta;two"));
        assertSameEndpoint(
                endpoint("jdbc:oracle:thin:alice/alpha@//db.example:1521/appsvc", "alice", "alpha"),
                endpoint("jdbc:oracle:thin:bob/beta@//db.example:1521/appsvc", "bob", "beta"));
    }

    @Test
    void db2ColonPropertiesExcludeCredentialsRegardlessOfTheirOrder() {
        DbConfig userFirst = endpoint(
                "jdbc:db2://db.example:50000/app:user=db2-user-first-sentinel;"
                        + "password=db2-password-first-sentinel;currentSchema=APP;",
                "config-user-first-sentinel",
                "config-password-first-sentinel");
        DbConfig passwordFirst = endpoint(
                "jdbc:db2://db.example:50000/app:password=db2-password-second-sentinel;"
                        + "user=db2-user-second-sentinel;currentSchema=APP;",
                "config-user-second-sentinel",
                "config-password-second-sentinel");

        SourceEndpointBinding binding = SourceEndpointBinding.capture(userFirst);

        assertThat(binding.matches(passwordFirst)).isTrue();
        assertThat(SourceEndpointBinding.capture(passwordFirst)).isEqualTo(binding);
        assertThat(binding.toString())
                .doesNotContain("db2-user-first-sentinel", "db2-password-first-sentinel",
                        "db2-user-second-sentinel", "db2-password-second-sentinel",
                        "config-user-first-sentinel", "config-password-first-sentinel",
                        "config-user-second-sentinel", "config-password-second-sentinel");
    }

    @Test
    void db2ColonPropertiesKeepHostDatabaseAndNonSecretPropertiesInIdentity() {
        SourceEndpointBinding binding = SourceEndpointBinding.capture(endpoint(
                "jdbc:db2://db-a.example:50000/app:user=alice;password=alpha;currentSchema=APP;",
                "alice",
                "alpha"));

        assertThat(binding.matches(endpoint(
                "jdbc:db2://db-b.example:50000/app:user=bob;password=beta;currentSchema=APP;",
                "bob",
                "beta"))).isFalse();
        assertThat(binding.matches(endpoint(
                "jdbc:db2://db-a.example:50000/other:user=bob;password=beta;currentSchema=APP;",
                "bob",
                "beta"))).isFalse();
        assertThat(binding.matches(endpoint(
                "jdbc:db2://db-a.example:50000/app:user=bob;password=beta;currentSchema=OTHER;",
                "bob",
                "beta"))).isFalse();
    }

    @Test
    void hostDatabaseAndOracleServiceChangesProduceDifferentEndpointIdentity() {
        DbConfig postgres = endpoint(
                "jdbc:postgresql://db-a.example:5432/app-a?sslmode=require", "alice", "alpha");
        SourceEndpointBinding binding = SourceEndpointBinding.capture(postgres);

        assertThat(binding.matches(endpoint(
                "jdbc:postgresql://db-b.example:5432/app-a?sslmode=require", "bob", "beta")))
                .isFalse();
        assertThat(binding.matches(endpoint(
                "jdbc:postgresql://db-a.example:5432/app-b?sslmode=require", "bob", "beta")))
                .isFalse();

        SourceEndpointBinding oracle = SourceEndpointBinding.capture(endpoint(
                "jdbc:oracle:thin:alice/alpha@//db.example:1521/service-a", "alice", "alpha"));
        assertThat(oracle.matches(endpoint(
                "jdbc:oracle:thin:bob/beta@//db.example:1521/service-b", "bob", "beta")))
                .isFalse();
    }

    @Test
    void endpointChangesSemanticIdentityAndDigestTamperingIsRejected() {
        String first = codec.write(snapshot(), driverEvidence, scope, endpoint(
                "jdbc:postgresql://db-a.example/app", "alice", "alpha", "source-a"));
        String second = codec.write(snapshot(), driverEvidence, scope, endpoint(
                "jdbc:postgresql://db-b.example/app", "bob", "beta", "source-b"));
        CatalogSnapshotArtifactEnvelope firstEnvelope = codec.readEnvelope(first);
        CatalogSnapshotArtifactEnvelope secondEnvelope = codec.readEnvelope(second);

        assertThat(secondEnvelope.payloadDigest()).isEqualTo(firstEnvelope.payloadDigest());
        assertThat(secondEnvelope.semanticDigest()).isNotEqualTo(firstEnvelope.semanticDigest());

        String tampered = first.replace(
                firstEnvelope.sourceEndpointBinding().endpointDigest(),
                "f".repeat(64));
        assertThatThrownBy(() -> codec.readEnvelope(tampered))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("semantic digest");
    }

    private static void assertSameEndpoint(DbConfig first, DbConfig second) {
        SourceEndpointBinding binding = SourceEndpointBinding.capture(first);
        assertThat(binding.matches(second)).isTrue();
        assertThat(SourceEndpointBinding.capture(second)).isEqualTo(binding);
    }

    private static DbConfig endpoint(String url, String username, String password) {
        return endpoint(url, username, password, "endpoint-id-sentinel");
    }

    private static DbConfig endpoint(
            String url,
            String username,
            String password,
            String endpointId
    ) {
        return new DbConfig(url, username, password, "driver-class-sentinel", endpointId);
    }

    private static CatalogSnapshot snapshot() {
        return new CatalogSnapshot(
                CatalogSnapshot.CURRENT_SCHEMA_VERSION,
                Instant.parse("2026-08-30T00:00:00Z"),
                new CatalogSnapshot.DatabaseInfo("PostgreSQL", "17", "pgjdbc", "42"),
                new CatalogSnapshot.EnvironmentInfo("legacy", "app", "UTF-8", "C", "UTC"),
                SnapshotCapability.unknown(),
                List.of(),
                List.of());
    }
}
