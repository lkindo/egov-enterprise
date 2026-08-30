package nuri.migration.identity;

import nuri.migration.state.MigrationStateStore.CheckpointEntry;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TypedKeyEncodingTest {

    @Test
    void versionedEncodingRoundTripsWithoutDelimiterOrTypeCollision() {
        TypedKeyTuple tuple = TypedKeyTuple.of(
                TypedValue.text("tenant|1:2"),
                TypedValue.decimal(new BigDecimal("10.00")),
                TypedValue.binary(new byte[] { 0, (byte) 0xff }));

        String encoded = TypedKeyEncoding.encode(tuple, 256, "checkpoint.source_key");

        assertThat(encoded).startsWith("tk1:");
        assertThat(TypedKeyEncoding.decode(encoded)).isEqualTo(tuple);
        assertThat(encoded).isNotEqualTo(TypedKeyEncoding.encode(
                TypedKeyTuple.of(TypedValue.text("tenant"), TypedValue.text("1:2|10.00")),
                256, "checkpoint.source_key"));
        assertThat(TypedKeyEncoding.encode(TypedKeyTuple.of(TypedValue.text("1")), 256, "key"))
                .isNotEqualTo(TypedKeyEncoding.encode(
                        TypedKeyTuple.of(TypedValue.signedInteger(1)), 256, "key"));
    }

    @Test
    void rejectsUnknownVersionsMalformedPayloadAndSchemaOverflow() {
        assertThatThrownBy(() -> TypedKeyEncoding.decode("tk2:AAAA"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("version");
        assertThatThrownBy(() -> TypedKeyEncoding.decode("tk1:not+base64"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("canonical");
        assertThatThrownBy(() -> TypedKeyEncoding.encode(
                TypedKeyTuple.of(TypedValue.text("x".repeat(400))), 256, "keymap.legacy_key"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("256");
    }

    @Test
    void checkpointTypedFactoryAppliesTheSameBoundedEncodingToBothSides() {
        TypedKeyTuple source = TypedKeyTuple.of(TypedValue.text("tenant"), TypedValue.signedInteger(1));
        TypedKeyTuple target = TypedKeyTuple.of(TypedValue.text("tenant"), TypedValue.signedInteger(101));

        CheckpointEntry entry = CheckpointEntry.typed(
                "legacy_order", source, "tb_order", target, "a".repeat(64));

        assertThat(entry.sourceKey()).startsWith("tk1:");
        assertThat(entry.targetKey()).startsWith("tk1:");
        assertThat(TypedKeyEncoding.decode(entry.sourceKey())).isEqualTo(source);
        assertThat(TypedKeyEncoding.decode(entry.targetKey())).isEqualTo(target);
    }
}
