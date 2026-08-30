package nuri.migration.etl;

import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.IdentityComponentSpec;
import nuri.migration.model.MappingSpec.IdentityStrategy;
import nuri.migration.model.MappingSpec.TableMapping;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** fkRef 위상정렬: 선언 순서와 무관하게 부모가 자식보다 먼저 오는지 검증. */
class TableOrdererTest {

    private static TableMapping table(String source, ColumnMapping... cols) {
        return new TableMapping(source, "t_" + source.toLowerCase(), null, List.of(cols), null);
    }

    private static ColumnMapping fk(String target, String fkRef) {
        return new ColumnMapping(target.toUpperCase(), target, null, null, null, fkRef, null);
    }

    private static ColumnMapping plain(String target) {
        return new ColumnMapping(target.toUpperCase(), target, null, null, null, null, null);
    }

    @Test
    void parentBeforeChildEvenWhenDeclaredChildFirst() {
        // 선언 순서: CHILD, PARENT (역순). CHILD.parent_id → fkRef PARENT.
        TableMapping child = table("CHILD", fk("parent_id", "PARENT"));
        TableMapping parent = table("PARENT", plain("name"));

        List<TableMapping> ordered = TableOrderer.order(List.of(child, parent));

        assertThat(ordered).extracting(t -> t.source()).containsExactly("PARENT", "CHILD");
    }

    @Test
    void threeLevelChain() {
        // GRANDCHILD → CHILD → PARENT, 선언은 뒤죽박죽.
        TableMapping grand = table("GRANDCHILD", fk("child_id", "CHILD"));
        TableMapping child = table("CHILD", fk("parent_id", "PARENT"));
        TableMapping parent = table("PARENT", plain("name"));

        List<TableMapping> ordered = TableOrderer.order(List.of(grand, parent, child));

        assertThat(ordered).extracting(t -> t.source())
                .containsExactly("PARENT", "CHILD", "GRANDCHILD");
    }

    @Test
    void selfReferenceDoesNotDeadlock() {
        // 자기참조(트리): fkRef == 자기 소스 → 위상 간선 제외, 데드락 없이 포함.
        TableMapping tree = table("ORG", fk("parent_org_id", "ORG"), plain("name"));

        List<TableMapping> ordered = TableOrderer.order(List.of(tree));

        assertThat(ordered).extracting(t -> t.source()).containsExactly("ORG");
    }

    @Test
    void crossTableCycleFailsClosedEvenIfValidationWasBypassed() {
        TableMapping a = table("A", fk("b_id", "B"));
        TableMapping b = table("B", fk("a_id", "A"));

        assertThatThrownBy(() -> TableOrderer.order(List.of(a, b)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("FK 순환", "a", "b");
    }

    @Test
    void typedCompositeForeignKeyAlsoOrdersParentBeforeChild() {
        TableMapping parent = typedTable("PARENT", List.of());
        TableMapping child = typedTable("CHILD", List.of(typedFk("PARENT")));

        List<TableMapping> ordered = TableOrderer.order(List.of(child, parent));

        assertThat(ordered).extracting(TableMapping::source).containsExactly("PARENT", "CHILD");
    }

    @Test
    void typedCompositeCrossTableCycleFailsClosed() {
        TableMapping a = typedTable("A", List.of(typedFk("B")));
        TableMapping b = typedTable("B", List.of(typedFk("A")));

        assertThatThrownBy(() -> TableOrderer.order(List.of(a, b)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("FK 순환", "a", "b");
    }

    private static TableMapping typedTable(String source, List<CompositeForeignKey> foreignKeys) {
        IdentityComponentSpec id = new IdentityComponentSpec("ID", IdentityValueType.SIGNED_INTEGER);
        return new TableMapping(
                source, "t_" + source.toLowerCase(), null, null, List.of("ID"), null,
                List.of(), null,
                new IdentityStrategy(TargetIdentityPolicy.PRESERVE, List.of(id),
                        List.of(new IdentityComponentSpec("id", IdentityValueType.SIGNED_INTEGER))),
                foreignKeys);
    }

    private static CompositeForeignKey typedFk(String parent) {
        return new CompositeForeignKey(
                parent,
                List.of(new IdentityComponentSpec("PARENT_ID", IdentityValueType.SIGNED_INTEGER)),
                List.of(new IdentityComponentSpec("id", IdentityValueType.SIGNED_INTEGER)));
    }
}
