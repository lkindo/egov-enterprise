package nuri.migration.keymap;

import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.keymap.KeyMapRegistry.Checkpoint;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KeyMapRegistryTest {

    @Test
    void rollbackRemovesPendingMappingFromTranslationState() {
        KeyMapRegistry registry = new KeyMapRegistry();
        Checkpoint checkpoint = registry.checkpoint();
        String generated = registry.mintOrGet("LEGACY_USER", "u1", "USR");

        assertThat(registry.translate("legacy_user", "u1")).isEqualTo(generated);
        assertThat(registry.hasPending()).isTrue();

        registry.rollback(checkpoint);

        assertThat(registry.translate("legacy_user", "u1")).isNull();
        assertThat(registry.hasMappingFor("legacy_user")).isFalse();
        assertThat(registry.hasPending()).isFalse();
    }

    @Test
    void acceptClearsPendingMarkerButKeepsCommittedTranslationIdentity() {
        KeyMapRegistry registry = new KeyMapRegistry();
        Checkpoint checkpoint = registry.checkpoint();
        String generated = registry.mintOrGet("LEGACY_USER", "u1", "USR");

        registry.accept(checkpoint);

        assertThat(registry.translate("legacy_user", "u1")).isEqualTo(generated);
        assertThat(registry.mintOrGet("legacy_user", "u1", "DIFFERENT")).isEqualTo(generated);
        assertThat(registry.hasPending()).isFalse();
    }

    @Test
    void nestedRowRollbackDoesNotRemoveEarlierChunkMapping() {
        KeyMapRegistry registry = new KeyMapRegistry();
        Checkpoint chunk = registry.checkpoint();
        String first = registry.mintOrGet("LEGACY_USER", "u1", "USR");
        Checkpoint secondRow = registry.checkpoint();
        registry.mintOrGet("LEGACY_USER", "u2", "USR");

        registry.rollback(secondRow);

        assertThat(registry.translate("legacy_user", "u1")).isEqualTo(first);
        assertThat(registry.translate("legacy_user", "u2")).isNull();
        assertThat(registry.hasPending()).isTrue();

        registry.accept(chunk);
        assertThat(registry.hasPending()).isFalse();
    }

    @Test
    void typedCompositeMappingsPreserveOrderAndTypeWithoutChangingLegacyStringMappings() {
        KeyMapRegistry registry = new KeyMapRegistry();
        TypedKeyTuple source = TypedKeyTuple.of(TypedValue.text("tenant|1"), TypedValue.signedInteger(7));
        TypedKeyTuple target = TypedKeyTuple.of(TypedValue.text("tenant|1"), TypedValue.signedInteger(107));
        Checkpoint checkpoint = registry.checkpoint();

        registry.register("LEGACY_ORDER", source, target);

        assertThat(registry.translate("legacy_order", source)).isEqualTo(target);
        assertThat(registry.translate("legacy_order",
                TypedKeyTuple.of(TypedValue.text("tenant|1"), TypedValue.text("7")))).isNull();
        assertThat(registry.translate("legacy_order", "tenant|1|7")).isNull();

        registry.rollback(checkpoint);
        assertThat(registry.translate("legacy_order", source)).isNull();
    }

    @Test
    void typedMappingRejectsConflictingTargetForTheSameSourceIdentity() {
        KeyMapRegistry registry = new KeyMapRegistry();
        TypedKeyTuple source = TypedKeyTuple.of(TypedValue.signedInteger(1));
        registry.register("LEGACY_ORDER", source,
                TypedKeyTuple.of(TypedValue.signedInteger(101)));

        assertThatThrownBy(() -> registry.register("LEGACY_ORDER", source,
                TypedKeyTuple.of(TypedValue.signedInteger(102))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("conflict");
    }
}
