package nuri.migration.type;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;

/**
 * DB 벤더 타입을 직접 섞지 않는 migration-tool 내부 논리 타입 IR.
 *
 * <p>알 수 없는 정밀도·길이·문자셋은 임의 기본값으로 채우지 않고 nullable 메타데이터로 유지한다.
 * 벤더 전용 타입은 {@link OpaqueType}으로 원본 제품과 타입명을 명시해야 한다.
 */
public sealed interface LogicalType permits
        LogicalType.IntegerType,
        LogicalType.DecimalType,
        LogicalType.TextType,
        LogicalType.BooleanType,
        LogicalType.DateType,
        LogicalType.TimeType,
        LogicalType.LocalTimestampType,
        LogicalType.OffsetTimestampType,
        LogicalType.IntervalType,
        LogicalType.UuidType,
        LogicalType.BinaryType,
        LogicalType.LobType,
        LogicalType.JsonType,
        LogicalType.XmlType,
        LogicalType.EnumType,
        LogicalType.ArrayType,
        LogicalType.SpatialType,
        LogicalType.OpaqueType {

    enum Signedness {
        SIGNED,
        UNSIGNED
    }

    enum IntervalFamily {
        YEAR_MONTH,
        DAY_TIME,
        MIXED
    }

    enum LobKind {
        CHARACTER,
        BINARY
    }

    record IntegerType(int bits, Signedness signedness) implements LogicalType {
        public IntegerType {
            if (bits <= 0) {
                throw new IllegalArgumentException("integer bits must be positive");
            }
            Objects.requireNonNull(signedness, "signedness");
        }
    }

    /** null은 정밀도 미상이며, scale은 Oracle 등 벤더의 음수 값도 보존하기 위해 제한하지 않는다. */
    record DecimalType(Integer precision, Integer scale) implements LogicalType {
        public DecimalType {
            if (precision != null && precision <= 0) {
                throw new IllegalArgumentException("decimal precision must be positive");
            }
        }
    }

    /** maxLength가 null이면 길이가 없다는 뜻이 아니라 catalog에서 알 수 없다는 뜻이다. */
    record TextType(Integer maxLength, String charset, String collation) implements LogicalType {
        public TextType {
            positiveWhenKnown(maxLength, "text maxLength");
            nonBlankWhenKnown(charset, "text charset");
            nonBlankWhenKnown(collation, "text collation");
        }
    }

    record BooleanType() implements LogicalType {}

    record DateType() implements LogicalType {}

    /** 초 소수 정밀도는 0~9 또는 catalog에서 알 수 없음을 나타내는 null로 보존한다. */
    record TimeType(Integer precision) implements LogicalType {
        public TimeType {
            temporalPrecision(precision);
        }
    }

    record LocalTimestampType(Integer precision) implements LogicalType {
        public LocalTimestampType {
            temporalPrecision(precision);
        }
    }

    record OffsetTimestampType(Integer precision) implements LogicalType {
        public OffsetTimestampType {
            temporalPrecision(precision);
        }
    }

    record IntervalType(IntervalFamily family) implements LogicalType {
        public IntervalType {
            Objects.requireNonNull(family, "family");
        }
    }

    record UuidType() implements LogicalType {}

    /** maxLength가 null이면 길이 미상이다. 대용량 값은 별도의 {@link LobType}으로 표현한다. */
    record BinaryType(Integer maxLength) implements LogicalType {
        public BinaryType {
            positiveWhenKnown(maxLength, "binary maxLength");
        }
    }

    record LobType(LobKind kind, String charset) implements LogicalType {
        public LobType {
            Objects.requireNonNull(kind, "kind");
            nonBlankWhenKnown(charset, "LOB charset");
        }
    }

    record JsonType() implements LogicalType {}

    record XmlType() implements LogicalType {}

    record EnumType(String vendorTypeName, List<String> labels) implements LogicalType {
        public EnumType {
            vendorTypeName = requireNonBlank(vendorTypeName, "enum vendorTypeName");
            labels = List.copyOf(Objects.requireNonNull(labels, "labels"));
            if (labels.isEmpty()) {
                throw new IllegalArgumentException("enum labels must not be empty");
            }
            for (String label : labels) {
                requireNonBlank(label, "enum label");
            }
            if (new HashSet<>(labels).size() != labels.size()) {
                throw new IllegalArgumentException("enum labels contain duplicate values");
            }
        }
    }

    record ArrayType(LogicalType elementType, int dimensions) implements LogicalType {
        public ArrayType {
            Objects.requireNonNull(elementType, "elementType");
            if (dimensions <= 0) {
                throw new IllegalArgumentException("array dimensions must be positive");
            }
        }
    }

    /** srid가 null이면 catalog에 좌표계 정보가 없다는 뜻이며 0이나 4326으로 추측하지 않는다. */
    record SpatialType(String geometryType, Integer srid) implements LogicalType {
        public SpatialType {
            geometryType = requireNonBlank(geometryType, "geometryType");
            if (srid != null && srid < 0) {
                throw new IllegalArgumentException("spatial srid must not be negative");
            }
        }
    }

    record OpaqueType(String vendor, String vendorTypeName) implements LogicalType {
        public OpaqueType {
            vendor = requireNonBlank(vendor, "opaque vendor");
            vendorTypeName = requireNonBlank(vendorTypeName, "opaque vendorTypeName");
        }
    }

    private static void temporalPrecision(Integer precision) {
        if (precision != null && (precision < 0 || precision > 9)) {
            throw new IllegalArgumentException("temporal precision must be between 0 and 9");
        }
    }

    private static void positiveWhenKnown(Integer value, String label) {
        if (value != null && value <= 0) {
            throw new IllegalArgumentException(label + " must be positive when known");
        }
    }

    private static void nonBlankWhenKnown(String value, String label) {
        if (value != null) {
            requireNonBlank(value, label);
        }
    }

    private static String requireNonBlank(String value, String label) {
        Objects.requireNonNull(value, label);
        if (value.isBlank() || !value.equals(value.trim())) {
            throw new IllegalArgumentException(label + " must be non-blank and trimmed");
        }
        return value;
    }
}
