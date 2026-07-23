package nuri.migration.transform;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

/**
 * {@code mapping.yml}의 {@code type:} 힌트를 실제 Java/JDBC 타입으로 강제 변환한다.
 *
 * <p>기존 설계에서 {@code ColumnMapping.type}은 선언만 되고 적용되지 않던 死 DSL 이었다(EtlExecutor 미참조).
 * 본 변환기가 이를 활성화해, 레거시 문자열/이종 타입을 표준 스키마의 실제 컬럼 타입으로 안전하게 강제한다.
 * 반환 타입은 {@code PreparedStatement.setObject}(JDBC 4.2, H2·PostgreSQL 지원)가 그대로 바인딩한다.
 *
 * <p>알 수 없는 type 은 원본 반환(검증 단계가 경고). null 은 항상 null.
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
        return type != null && KNOWN.contains(type.toLowerCase());
    }

    public static Object convert(String type, Object value) {
        if (type == null || type.isBlank() || value == null) {
            return value;
        }
        String t = type.toLowerCase();
        String s = value instanceof String str ? str.trim() : value.toString().trim();
        if (s.isEmpty() && !("string".equals(t) || "varchar".equals(t) || "text".equals(t) || "char".equals(t))) {
            return null; // 빈 문자열 → 비문자 타입은 NULL(레거시 공백 관용)
        }
        return switch (t) {
            case "string", "varchar", "text", "char" -> value instanceof String ? value : value.toString();
            case "int", "integer" -> Integer.valueOf(stripDecimal(s));
            case "long", "bigint" -> Long.valueOf(stripDecimal(s));
            case "decimal", "numeric" -> new BigDecimal(s);
            case "double" -> Double.valueOf(s);
            case "boolean", "bool" -> toBoolean(s);
            case "date" -> parseDate(s);
            case "timestamp", "datetime" -> parseTimestamp(s);
            case "uuid" -> UUID.fromString(s);
            default -> value; // 미지 type → 원본(검증 경고)
        };
    }

    private static String stripDecimal(String s) {
        int dot = s.indexOf('.');
        return dot < 0 ? s : s.substring(0, dot); // "12.0" → "12"
    }

    private static Boolean toBoolean(String s) {
        return switch (s.toUpperCase()) {
            case "Y", "T", "TRUE", "1" -> Boolean.TRUE;
            case "N", "F", "FALSE", "0" -> Boolean.FALSE;
            default -> throw new IllegalArgumentException("boolean 변환 불가: '" + s + "'");
        };
    }

    private static LocalDate parseDate(String s) {
        String d = s.length() == 8 && s.chars().allMatch(Character::isDigit)
                ? s.substring(0, 4) + "-" + s.substring(4, 6) + "-" + s.substring(6, 8) // YYYYMMDD
                : s.length() > 10 ? s.substring(0, 10) : s;
        return LocalDate.parse(d, DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private static LocalDateTime parseTimestamp(String s) {
        String v = s.replace('T', ' ');
        try {
            return LocalDateTime.parse(v.replace(' ', 'T'), DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (RuntimeException e) {
            return LocalDateTime.parse(v, FLEX_TS);
        }
    }
}
