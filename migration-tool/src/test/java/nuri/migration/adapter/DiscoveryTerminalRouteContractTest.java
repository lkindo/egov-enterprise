package nuri.migration.adapter;

import nuri.migration.discovery.ObjectKind;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class DiscoveryTerminalRouteContractTest {

    @Test
    void everyAdapterHasOneTerminalRouteForEveryObjectKind() {
        for (SourceAdapter adapter : adapters()) {
            assertThat(adapter.discoveryRoutes().keySet())
                    .as(adapter.id())
                    .containsExactlyInAnyOrder(ObjectKind.values());
            assertThat(adapter.discoveryRoutes()).as(adapter.id()).hasSize(ObjectKind.values().length);
        }
    }

    @Test
    void unsupportedDiscoveryCannotBeAdvertisedAsSupportedCapability() {
        for (SourceAdapter adapter : adapters()) {
            for (ObjectKind kind : ObjectKind.values()) {
                if (adapter.discoveryRoutes().get(kind) == DiscoveryTerminalRoute.UNSUPPORTED) {
                    assertThat(adapter.capabilities().supportFor(kind))
                            .as(adapter.id() + " -> " + kind)
                            .isEqualTo(ObjectSupportGrade.UNSUPPORTED);
                }
            }
        }
    }

    @Test
    void executableQueriesAndKnownAbsenceOwnAnExplicitTerminalRoute() {
        for (SourceAdapter adapter : adapters()) {
            adapter.catalogQueries().forEach(query -> assertThat(adapter.discoveryRoutes().get(query.kind()))
                    .as(adapter.id() + " -> " + query.operation())
                    .isIn(DiscoveryTerminalRoute.OBJECTS, DiscoveryTerminalRoute.PARTIAL_PROBE));
        }

        assertThat(new MySqlSourceAdapter().discoveryRoutes().get(ObjectKind.MATERIALIZED_VIEW))
                .isEqualTo(DiscoveryTerminalRoute.NOT_APPLICABLE);
        assertThat(new MariaDbSourceAdapter().discoveryRoutes().get(ObjectKind.MATERIALIZED_VIEW))
                .isEqualTo(DiscoveryTerminalRoute.NOT_APPLICABLE);
    }

    @Test
    void jdbcUnknownTableTypeUsesItsExistingObjectCollectorRoute() {
        JdbcMetadataSourceAdapter adapter = new JdbcMetadataSourceAdapter();

        assertThat(adapter.discoveryRoutes().get(ObjectKind.UNKNOWN))
                .isEqualTo(DiscoveryTerminalRoute.OBJECTS);
        assertThat(adapter.capabilities().supportFor(ObjectKind.UNKNOWN))
                .isEqualTo(ObjectSupportGrade.METADATA_ONLY);
    }

    @Test
    void knownPartialVendorCatalogsNeverAdvertiseACompleteObjectRoute() {
        Set<ObjectKind> partialKinds = Set.of(ObjectKind.PARTITION, ObjectKind.GRANT, ObjectKind.JOB);

        for (SourceAdapter adapter : adapters()) {
            adapter.catalogQueries().stream()
                    .filter(query -> partialKinds.contains(query.kind()))
                    .forEach(query -> assertThat(adapter.discoveryRoutes().get(query.kind()))
                            .as(adapter.id() + " -> " + query.operation())
                            .isEqualTo(DiscoveryTerminalRoute.PARTIAL_PROBE));
        }
    }

    private static List<SourceAdapter> adapters() {
        return List.of(
                new JdbcMetadataSourceAdapter(),
                new PostgreSqlSourceAdapter(),
                new OracleSourceAdapter(),
                new TiberoSourceAdapter(),
                new MySqlSourceAdapter(),
                new MariaDbSourceAdapter(),
                new SqlServerSourceAdapter());
    }
}
