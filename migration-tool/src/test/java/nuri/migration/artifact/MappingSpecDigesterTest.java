package nuri.migration.artifact;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.DbConfig;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.RunContext;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MappingSpecDigesterTest {

    @Test
    void excludesConnectionSecretsButBindsEndpointsRunAndMappingSemantics() {
        MappingSpec first = spec(
                new DbConfig("jdbc:postgresql://secret-a/source", "user-a", "password-a", "driver-a",
                        "source-endpoint-a"),
                new DbConfig("jdbc:postgresql://secret-a/target", "target-a", "password-b", "driver-b",
                        "target-endpoint-a"),
                new RunContext("run-a", "namespace-a"),
                "ACTIVE");
        MappingSpec differentSecrets = spec(
                new DbConfig("jdbc:oracle:thin:@secret-b", "user-b", "password-c", "driver-c",
                        "source-endpoint-a"),
                new DbConfig("jdbc:postgresql://secret-c/target", "target-c", "password-d", "driver-d",
                        "target-endpoint-a"),
                new RunContext("run-a", "namespace-a"),
                "ACTIVE");
        MappingSpec changedRun = spec(
                first.source(), first.target(), new RunContext("run-b", "namespace-a"), "ACTIVE");
        MappingSpec changedNamespace = spec(
                first.source(), first.target(), new RunContext("run-a", "namespace-b"), "ACTIVE");
        MappingSpec changedEndpoint = spec(
                new DbConfig(first.source().url(), first.source().username(), first.source().password(),
                        first.source().driver(), "source-endpoint-b"),
                first.target(), first.run(), "ACTIVE");
        MappingSpec changedCodemap = spec(first.source(), first.target(), first.run(), "ENABLED");

        String digest = MappingSpecDigester.sha256(first);

        assertThat(MappingSpecDigester.sha256(differentSecrets)).isEqualTo(digest);
        assertThat(MappingSpecDigester.sha256(changedRun)).isNotEqualTo(digest);
        assertThat(MappingSpecDigester.sha256(changedNamespace)).isNotEqualTo(digest);
        assertThat(MappingSpecDigester.sha256(changedEndpoint)).isNotEqualTo(digest);
        assertThat(MappingSpecDigester.sha256(changedCodemap)).isNotEqualTo(digest);
        assertThat(digest).matches("[0-9a-f]{64}");
        assertThat(digest).doesNotContain(
                "secret-a", "user-a", "password-a", "namespace-a",
                "source-endpoint-a", "target-endpoint-a", "run-a");
    }

    @Test
    void bindsOrderedIdentityAndCompositeForeignKeyContracts() {
        MappingSpec baseline = spec(null, null, null, "ACTIVE");
        TableMapping table = baseline.tables().getFirst();
        CompositeForeignKey changed = new CompositeForeignKey(
                "legacy_parent",
                table.foreignKeys().getFirst().sourceComponents(),
                List.of(component("tenant_id", IdentityValueType.TEXT),
                        component("different_parent_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping changedTable = new TableMapping(
                table.source(), table.target(), table.where(), table.orderBy(), table.orderByKeys(),
                table.targetKey(), table.columns(), table.idStrategy(), table.identity(), List.of(changed));
        MappingSpec changedSpec = new MappingSpec(null, null, List.of(changedTable), baseline.codemaps(), null);

        assertThat(MappingSpecDigester.sha256(changedSpec))
                .isNotEqualTo(MappingSpecDigester.sha256(baseline));
    }

    private static MappingSpec spec(DbConfig source, DbConfig target, RunContext run, String activeCode) {
        IdentityStrategy identity = new IdentityStrategy(
                TargetIdentityPolicy.PRESERVE,
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("CHILD_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("tenant_id", IdentityValueType.TEXT),
                        component("child_id", IdentityValueType.SIGNED_INTEGER)));
        CompositeForeignKey foreignKey = new CompositeForeignKey(
                "legacy_parent",
                List.of(component("TENANT_ID", IdentityValueType.TEXT),
                        component("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(component("tenant_id", IdentityValueType.TEXT),
                        component("parent_id", IdentityValueType.SIGNED_INTEGER)));
        TableMapping table = new TableMapping(
                "legacy_child", "tb_child", "ACTIVE_YN = 'Y'", null,
                List.of("TENANT_ID", "CHILD_ID"), null,
                List.of(new ColumnMapping("PAYLOAD", "payload", "trim", "string", "status", null, null)),
                null, identity, List.of(foreignKey));
        return new MappingSpec(
                source, target, List.of(table), Map.of("status", Map.of("A", activeCode)), run);
    }

    private static IdentityComponentSpec component(String column, IdentityValueType type) {
        return new IdentityComponentSpec(column, type);
    }
}
