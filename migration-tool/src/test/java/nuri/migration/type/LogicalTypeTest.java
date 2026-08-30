package nuri.migration.type;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LogicalTypeTest {

    @Test
    void representsTheRequiredVendorNeutralTypeFamilies() {
        List<LogicalType> types = List.of(
                new LogicalType.IntegerType(32, LogicalType.Signedness.SIGNED),
                new LogicalType.IntegerType(64, LogicalType.Signedness.UNSIGNED),
                new LogicalType.DecimalType(30, 10),
                new LogicalType.TextType(null, "UTF-8", "ko_KR"),
                new LogicalType.BooleanType(),
                new LogicalType.DateType(),
                new LogicalType.TimeType(6),
                new LogicalType.LocalTimestampType(6),
                new LogicalType.OffsetTimestampType(6),
                new LogicalType.IntervalType(LogicalType.IntervalFamily.DAY_TIME),
                new LogicalType.UuidType(),
                new LogicalType.BinaryType(4096),
                new LogicalType.LobType(LogicalType.LobKind.CHARACTER, "UTF-8"),
                new LogicalType.JsonType(),
                new LogicalType.XmlType(),
                new LogicalType.EnumType("legacy.status_type", List.of("READY", "DONE")),
                new LogicalType.ArrayType(new LogicalType.IntegerType(32, LogicalType.Signedness.SIGNED), 2),
                new LogicalType.SpatialType("POINT", 4326),
                new LogicalType.OpaqueType("oracle", "ANYDATA"));

        assertThat(types).hasSize(19).doesNotContainNull();
        assertThat(((LogicalType.IntegerType) types.get(1)).signedness())
                .isEqualTo(LogicalType.Signedness.UNSIGNED);
        assertThat(((LogicalType.OffsetTimestampType) types.get(8)).precision()).isEqualTo(6);
    }

    @Test
    void enumLabelsAreDefensivelyCopiedAndMustBeUnique() {
        List<String> labels = new java.util.ArrayList<>(List.of("READY", "DONE"));
        LogicalType.EnumType type = new LogicalType.EnumType("status_type", labels);
        labels.set(0, "CORRUPTED");

        assertThat(type.labels()).containsExactly("READY", "DONE");
        assertThatThrownBy(() -> new LogicalType.EnumType("status_type", List.of("READY", "READY")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("duplicate");
    }

    @Test
    void precisionScaleAndDimensionsRejectInvalidMetadataInsteadOfGuessing() {
        assertThat(new LogicalType.DecimalType(null, null).precision()).isNull();
        assertThat(new LogicalType.TimeType(null).precision()).isNull();
        assertThatThrownBy(() -> new LogicalType.DecimalType(0, 3))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new LogicalType.TimeType(10))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new LogicalType.ArrayType(new LogicalType.JsonType(), 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new LogicalType.OpaqueType("oracle", " "))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void conversionSafetyMakesAutomaticApprovalBoundariesExplicit() {
        assertThat(ConversionSafety.LOSSLESS.permitsAutomaticConversion()).isTrue();
        assertThat(ConversionSafety.VALIDATED.requiresValidation()).isTrue();
        assertThat(ConversionSafety.LOSSY_REQUIRES_APPROVAL.requiresApproval()).isTrue();
        assertThat(ConversionSafety.MANUAL.blocksAutomaticConversion()).isTrue();
        assertThat(ConversionSafety.UNSUPPORTED.blocksAutomaticConversion()).isTrue();
    }
}
