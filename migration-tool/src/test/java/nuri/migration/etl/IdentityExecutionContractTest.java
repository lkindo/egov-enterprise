package nuri.migration.etl;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IdentityExecutionContractTest {

    @Test
    void targetGeneratedIdentityIsReturnedButNotSilentlyAddedToInsertBindings() {
        TableMapping table = table("LEGACY_ORDER", "tb_order", TargetIdentityPolicy.TARGET_GENERATED);

        assertThat(EtlExecutor.canonicalTargetColumns(table))
                .containsExactly("tenant_id", "payload", "order_id");
        assertThat(EtlExecutor.insertTargetColumns(table))
                .containsExactly("tenant_id", "payload");
        assertThat(EtlExecutor.buildInsertSql(
                table.target(), EtlExecutor.insertTargetColumns(table),
                table.identity().targetComponents().stream().map(IdentityComponentSpec::column).toList()))
                .isEqualTo("INSERT INTO tb_order (tenant_id, payload) VALUES (?, ?) "
                        + "RETURNING tenant_id, order_id");
    }

    @Test
    void legacyAndNewIdentityStrategiesCannotCompeteForTheSameTable() {
        TableMapping typed = table("LEGACY_ORDER", "tb_order", TargetIdentityPolicy.REMAP);
        TableMapping ambiguous = new TableMapping(
                typed.source(), typed.target(), typed.where(), typed.orderBy(), typed.orderByKeys(),
                typed.targetKey(), typed.columns(),
                new MappingSpec.IdStrategy("order_id", "ORD", "ORDER_NO"),
                typed.identity(), typed.foreignKeys());
        MappingSpec spec = new MappingSpec(null, null, List.of(ambiguous), Map.of(),
                new MappingSpec.RunContext("run", "source"));

        assertThatThrownBy(() -> EtlExecutor.requireCommitContract(spec))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("idStrategy")
                .hasMessageContaining("identity");
    }

    @Test
    void remapRequiresEveryTargetIdentityComponentToHaveAnExplicitValueProducer() {
        TableMapping remap = table("LEGACY_ORDER", "tb_order", TargetIdentityPolicy.REMAP);
        MappingSpec spec = new MappingSpec(null, null, List.of(remap), Map.of(),
                new MappingSpec.RunContext("run", "source"));

        assertThatThrownBy(() -> EtlExecutor.requireCommitContract(spec))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("REMAP")
                .hasMessageContaining("order_id");
    }

    @Test
    void compositeForeignKeyRequiresParentBeforeChildAndRejectsSelfReference() {
        TableMapping parent = table("LEGACY_PARENT", "tb_parent", TargetIdentityPolicy.TARGET_GENERATED);
        CompositeForeignKey reference = new CompositeForeignKey(
                "LEGACY_PARENT",
                parent.identity().sourceComponents(),
                parent.identity().targetComponents());
        TableMapping child = new TableMapping(
                "LEGACY_CHILD", "tb_child", null, null, List.of("TENANT_ID", "ORDER_NO"), null,
                List.of(), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(component("CHILD_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("child_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(reference));

        assertThatThrownBy(() -> EtlExecutor.requireCompositeForeignKeyOrder(List.of(child, parent)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("parent-first");

        CompositeForeignKey self = new CompositeForeignKey(
                "LEGACY_CHILD", reference.sourceComponents(), reference.targetComponents());
        TableMapping selfChild = new TableMapping(
                child.source(), child.target(), child.where(), child.orderBy(), child.orderByKeys(),
                child.targetKey(), child.columns(), child.idStrategy(), child.identity(), List.of(self));
        assertThatThrownBy(() -> EtlExecutor.requireCompositeForeignKeyOrder(List.of(selfChild)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("self");
    }

    @Test
    void compositeForeignKeyMatchesParentIdentityByOrderedTypesNotChildColumnNames() {
        TableMapping parent = table("LEGACY_PARENT", "tb_parent", TargetIdentityPolicy.TARGET_GENERATED);
        CompositeForeignKey reference = new CompositeForeignKey(
                parent.source(),
                parent.identity().sourceComponents(),
                List.of(component("tenant_ref", IdentityValueType.TEXT),
                        component("parent_ref", IdentityValueType.SIGNED_INTEGER)));
        TableMapping child = new TableMapping(
                "LEGACY_CHILD", "tb_child", null, null, List.of("CHILD_ID"), null,
                List.of(), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE,
                        List.of(component("CHILD_ID", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("child_id", IdentityValueType.SIGNED_INTEGER))),
                List.of(reference));
        MappingSpec spec = new MappingSpec(
                null,
                new MappingSpec.DbConfig("jdbc:postgresql://localhost/test", null, null, null),
                List.of(parent, child), Map.of(),
                new MappingSpec.RunContext("run", "source"));

        assertThatCode(() -> EtlExecutor.requireCommitContract(spec)).doesNotThrowAnyException();
    }

    private static TableMapping table(String source, String target, TargetIdentityPolicy policy) {
        return new TableMapping(
                source, target, null, null, List.of("TENANT_ID", "ORDER_NO"), null,
                List.of(
                        new ColumnMapping("TENANT_ID", "tenant_id", null, null, null, null, null),
                        new ColumnMapping("PAYLOAD", "payload", null, null, null, null, null)),
                null,
                new IdentityStrategy(policy,
                        List.of(component("TENANT_ID", IdentityValueType.TEXT),
                                component("ORDER_NO", IdentityValueType.SIGNED_INTEGER)),
                        List.of(component("tenant_id", IdentityValueType.TEXT),
                                component("order_id", IdentityValueType.SIGNED_INTEGER))),
                List.of());
    }

    private static IdentityComponentSpec component(String column, IdentityValueType type) {
        return new IdentityComponentSpec(column, type);
    }
}
