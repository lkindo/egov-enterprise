package nuri.migration.keymap;

import nuri.migration.identity.TypedKeyTuple;
import nuri.migration.identity.TypedValue;
import nuri.migration.keymap.KeyMapRegistry.Checkpoint;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KeyMapRegistryTest {

    @Test
    void clearingAnOuterSuffixInvalidatesLaterCheckpointOffsets() throws Exception {
        try (KeyMapRegistry registry = new KeyMapRegistry()) {
            Checkpoint outer = registry.checkpoint();
            registry.mintOrGet("legacy_user", "first", "USR");
            Checkpoint inner = registry.checkpoint();
            registry.mintOrGet("legacy_user", "second", "USR");
            registry.rollback(outer);
            assertThatThrownBy(() -> registry.rollback(inner)).isInstanceOf(IllegalStateException.class);
            registry.mintOrGet("legacy_user", "third", "USR");
            Checkpoint later = registry.checkpoint();
            registry.accept(outer);
            assertThatThrownBy(() -> registry.accept(later)).isInstanceOf(IllegalStateException.class);
        }
    }

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

    @Test
    void chunkPrefetchCachesHitsAndMissesAndRollbackEvictsPendingMappings() {
        try (KeyMapRegistry registry = new KeyMapRegistry()) {
            Checkpoint committed = registry.checkpoint();
            String committedKey = registry.mintOrGet("legacy_user", "u1", "USR");
            TypedKeyTuple srcTuple = TypedKeyTuple.of(TypedValue.signedInteger(10));
            TypedKeyTuple dstTuple = TypedKeyTuple.of(TypedValue.signedInteger(110));
            registry.register("legacy_order", srcTuple, dstTuple);
            registry.accept(committed);

            java.util.List<String> bulk = new java.util.ArrayList<>();
            for (int i = 0; i < 650; i++) {
                bulk.add("u" + i);
            }
            registry.prefetch("LEGACY_USER", bulk);
            registry.prefetchTyped("LEGACY_ORDER", java.util.List.of(srcTuple, TypedKeyTuple.of(TypedValue.signedInteger(99))));

            assertThat(registry.translate("legacy_user", "u1")).isEqualTo(committedKey);
            assertThat(registry.translate("legacy_user", "u649")).isNull();
            assertThat(registry.translate("legacy_order", srcTuple)).isEqualTo(dstTuple);
            assertThat(registry.translate("legacy_order", TypedKeyTuple.of(TypedValue.signedInteger(99)))).isNull();

            Checkpoint chunk = registry.checkpoint();
            String pending = registry.mintOrGet("LEGACY_USER", "u649", "USR");
            assertThat(registry.translate("legacy_user", "u649")).isEqualTo(pending);

            registry.rollback(chunk);
            assertThat(registry.translate("legacy_user", "u649")).isNull();
            registry.clearChunkCache();
            assertThat(registry.translate("legacy_user", "u1")).isEqualTo(committedKey);
        }
    }
}
