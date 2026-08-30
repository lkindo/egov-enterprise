package nuri.migration.transform;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * {@code mapping.yml}의 {@code type:} 힌트를 실제 Java/JDBC 타입으로 강제 변환한다.
 *
 * <p>기존 설계에서 {@code ColumnMapping.type}은 선언만 되고 적용되지 않던 死 DSL 이었다(EtlExecutor 미참조).
 * 본 변환기가 이를 활성화해, 레거시 문자열/이종 타입을 표준 스키마의 실제 컬럼 타입으로 안전하게 강제한다.
 * 반환 타입은 {@code PreparedStatement.setObject}(JDBC 4.2, H2·PostgreSQL 지원)가 그대로 바인딩한다.
 *
 * <p>알 수 없는 type과 손실 가능한 변환은 원본 값을 노출하지 않고 fail-closed한다.
 * null은 항상 null이며, type 힌트를 생략한 경우만 기존 JDBC 값을 보존한다.
 */
public final class TypeConverter {

    /** 검증(MappingValidator)이 참조하는 알려진 type 집합. */
    public static final Set<String> KNOWN = Set.of(
            "string", "varchar", "text", "char",
            "int", "integer", "long", "bigint",
            "decimal", "numeric", "double",
            "boolean", "bool",
            "date", "timestamp", "datetime", "uuid");

    private static final DateTimeFormatter FLEX_TS = DateTimeFormatter.ofPattern("[yyyy-MM-dd'T'HH:mm:ss][yyyy-MM-dd HH:mm:ss][yyyy-MM-dd HH:mm]");

    private TypeConverter() {
    }

    public static boolean isKnown(String type) {
        return type != null && KNOWN.contains(type.toLowerCase(Locale.ROOT));
    }

    public static Object convert(String type, Object value) {
        if (type == null || type.isBlank() || value == null) {
            return value;
        }
        String t = type.toLowerCase(Locale.ROOT);
        if (!KNOWN.contains(t)) {
            throw conversionFailure();
        }
        String s = value instanceof String str ? str.trim() : value.toString().trim();
        if (s.isEmpty() && !("string".equals(t) || "varchar".equals(t) || "text".equals(t) || "char".equals(t))) {
            return null; // 빈 문자열 → 비문자 타입은 NULL(레거시 공백 관용)
        }
        try {
            return switch (t) {
                case "string", "varchar", "text", "char" -> value instanceof String ? value : value.toString();
                case "int", "integer" -> new BigDecimal(s).intValueExact();
                case "long", "bigint" -> new BigDecimal(s).longValueExact();
                case "decimal", "numeric" -> new BigDecimal(s);
                case "double" -> finiteDouble(s);
                case "boolean", "bool" -> toBoolean(s);
                case "date" -> parseDate(s);
                case "timestamp", "datetime" -> parseTimestamp(s);
                case "uuid" -> canonicalUuid(s);
                default -> throw conversionFailure();
            };
        } catch (RuntimeException failure) {
            if (failure instanceof ConversionFailure) {
                throw failure;
            }
            throw conversionFailure();
        }
    }

    private static Double finiteDouble(String value) {
        double converted = Double.parseDouble(value);
        if (!Double.isFinite(converted)) {
            throw conversionFailure();
        }
        return converted;
    }

    private static Boolean toBoolean(String s) {
        return switch (s.toUpperCase()) {
            case "Y", "T", "TRUE", "1" -> Boolean.TRUE;
            case "N", "F", "FALSE", "0" -> Boolean.FALSE;
            default -> throw conversionFailure();
        };
    }

    private static LocalDate parseDate(String s) {
        if (s.length() == 8 && s.chars().allMatch(Character::isDigit)) {
            String normalized = s.substring(0, 4) + "-" + s.substring(4, 6) + "-" + s.substring(6, 8);
            return LocalDate.parse(normalized, DateTimeFormatter.ISO_LOCAL_DATE);
        }
        if (s.length() == 10) {
            return LocalDate.parse(s, DateTimeFormatter.ISO_LOCAL_DATE);
        }
        return parseTimestamp(s).toLocalDate();
    }

    private static LocalDateTime parseTimestamp(String s) {
        String v = s.replace('T', ' ');
        try {
            return LocalDateTime.parse(v.replace(' ', 'T'), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (RuntimeException e) {
            return LocalDateTime.parse(v, FLEX_TS);
        }
    }

    private static UUID canonicalUuid(String value) {
        UUID uuid = UUID.fromString(value);
        if (!uuid.toString().equalsIgnoreCase(value)) {
            throw conversionFailure();
        }
        return uuid;
    }

    private static ConversionFailure conversionFailure() {
        return new ConversionFailure();
    }

    /** 입력 값과 parser cause를 담지 않는 고정 변환 실패. */
    private static final class ConversionFailure extends IllegalArgumentException {
        private ConversionFailure() {
            super("mapping type conversion failed");
        }
    }
}
