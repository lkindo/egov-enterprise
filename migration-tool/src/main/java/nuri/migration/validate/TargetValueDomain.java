package nuri.migration.validate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;

import java.sql.Types;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;

/**
 * 매핑 한 컬럼이 타깃에 쓰는 값의 종류와 선언 한계. 행 값을 보지 않고 매핑 선언과 승인 inventory 의
 * 소스 컬럼 선언만으로 정한다.
 *
 * <p>적용 순서는 ETL 과 같다: const → (source → transform → codemap → type 힌트) → fkRef(DEC-OPS-309).
 * const 는 type 힌트 없이 문자열로 바인딩되고, fkRef 는 생성된 표준 ID 문자열로 바뀐다.
 * 등록되었지만 내장이 아닌 변환기는 출력 계약을 그 변환기가 소유하므로 검증하지 않는다(exempt).
 */
record TargetValueDomain(
        Family family,
        Long maxChars,
        Integer integerRank,
        Integer intDigits,
        Integer scale,
        boolean exempt,
        boolean constant,
        boolean generatedKey) {

    /** 값·타깃 공통 종류. UNKNOWN 은 소스 선언을 확인하지 못한 값, OTHER 는 지원하지 않는 타깃 타입이다. */
    enum Family {
        TEXT, INTEGER, DECIMAL, APPROXIMATE, BOOLEAN, DATE, TIME, TIMESTAMP, TIMESTAMPTZ, BINARY, UUID,
        OTHER, UNKNOWN
    }

    private static final int TIMESTAMP_TEXT_LENGTH = 29;

    static TargetValueDomain of(ColumnMapping mapping, Map<String, CodeMap> codemaps,
                                Predicate<String> builtinTransformer, CatalogObject source) {
        if (mapping.constant() != null) {
            return new TargetValueDomain(Family.TEXT,
                    (long) mapping.constant().codePointCount(0, mapping.constant().length()),
                    null, null, null, false, true, false);
        }
        if (!isBlank(mapping.fkRef())) {
            return new TargetValueDomain(Family.TEXT, null, null, null, null, false, false, true);
        }
        if (isBlank(mapping.source())) {
            return exemptDomain();
        }
        TargetValueDomain value = fromSource(source);
        if (!isBlank(mapping.transform())) {
            if (!builtinTransformer.test(mapping.transform())) {
                return exemptDomain();
            }
            value = switch (mapping.transform()) {
                case "date", "date-truncate" -> plain(Family.DATE);
                case "timestamp" -> plain(Family.TIMESTAMP);
                default -> text(value.textLength());
            };
        }
        CodeMap codemap = isBlank(mapping.codemap()) ? null : codemaps.get(mapping.codemap());
        if (codemap != null) {
            value = text(codemapLength(codemap, value));
        }
        if (!isBlank(mapping.type())) {
            value = hinted(mapping.type().toLowerCase(Locale.ROOT), value);
        }
        return value;
    }

    private static TargetValueDomain hinted(String type, TargetValueDomain prior) {
        return switch (type) {
            case "string", "varchar", "text", "char" -> text(prior.textLength());
            case "int", "integer" -> integer(3);
            case "long", "bigint" -> integer(4);
            case "decimal", "numeric" -> prior.isExactNumeric()
                    ? decimal(prior.intDigits(), prior.scale())
                    : decimal(null, null);
            case "double" -> plain(Family.APPROXIMATE);
            case "boolean", "bool" -> plain(Family.BOOLEAN);
            case "date" -> plain(Family.DATE);
            case "timestamp", "datetime" -> plain(Family.TIMESTAMP);
            case "uuid" -> new TargetValueDomain(Family.UUID, 36L, null, null, null, false, false, false);
            default -> exemptDomain();
        };
    }

    /** 승인 inventory 의 JDBC 컬럼 선언(jdbcType·size·scale)으로 소스 값의 종류를 정한다. */
    static TargetValueDomain fromSource(CatalogObject source) {
        if (source == null) {
            return plain(Family.UNKNOWN);
        }
        Integer jdbcType = integerAttribute(source, "jdbcType");
        if (jdbcType == null) {
            return plain(Family.UNKNOWN);
        }
        Long size = longAttribute(source, "size");
        return switch (jdbcType) {
            case Types.CHAR, Types.VARCHAR, Types.LONGVARCHAR, Types.NCHAR, Types.NVARCHAR,
                    Types.LONGNVARCHAR, Types.CLOB, Types.NCLOB -> text(size == null || size <= 0 ? null : size);
            case Types.TINYINT -> integer(1);
            case Types.SMALLINT -> integer(2);
            case Types.INTEGER -> integer(3);
            case Types.BIGINT -> integer(4);
            case Types.NUMERIC, Types.DECIMAL -> sourceDecimal(size, integerAttribute(source, "scale"));
            case Types.REAL, Types.FLOAT, Types.DOUBLE -> plain(Family.APPROXIMATE);
            case Types.BIT, Types.BOOLEAN -> plain(Family.BOOLEAN);
            case Types.DATE -> plain(Family.DATE);
            case Types.TIME, Types.TIME_WITH_TIMEZONE -> plain(Family.TIME);
            case Types.TIMESTAMP -> plain(Family.TIMESTAMP);
            case Types.TIMESTAMP_WITH_TIMEZONE -> plain(Family.TIMESTAMPTZ);
            case Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY, Types.BLOB -> plain(Family.BINARY);
            default -> plain(Family.UNKNOWN);
        };
    }

    private static TargetValueDomain sourceDecimal(Long precision, Integer scale) {
        if (precision == null || precision <= 0 || scale == null || scale < 0 || scale > precision) {
            return decimal(null, null);
        }
        return decimal((int) (precision - scale), scale);
    }

    /**
     * codemap 이 내는 값의 최대 길이. 표준 코드와, 정책이 쓰는 대체값만 센다. 미매핑 코드를 그대로 통과시킬 때
     * ({@code unmapped: passthrough})만 앞 단계 값의 길이가 남는다. 기본 {@code fail} 은 미매핑 코드를 쓰지 않는다.
     */
    private static Long codemapLength(CodeMap codemap, TargetValueDomain prior) {
        long longest = 0;
        for (String mapped : codemap.values().values()) {
            longest = Math.max(longest, length(mapped));
        }
        if (codemap.unmapped() == UnmappedPolicy.FALLBACK || codemap.nullAs() == NullPolicy.FALLBACK) {
            longest = Math.max(longest, length(codemap.fallback()));
        }
        if (codemap.unmapped() != UnmappedPolicy.PASSTHROUGH) {
            return longest;
        }
        Long passThrough = prior.textLength();
        return passThrough == null ? null : Math.max(longest, passThrough);
    }

    private static long length(String value) {
        return value == null ? 0 : value.codePointCount(0, value.length());
    }

    /** 이 값을 문자열로 바꿨을 때의 최대 길이(toString). 알 수 없으면 null. */
    Long textLength() {
        return switch (family) {
            case TEXT -> maxChars;
            case INTEGER -> (long) digits(integerRank) + 1;
            case DECIMAL -> intDigits == null || scale == null ? null
                    : (long) intDigits + 1 + (scale > 0 ? scale + 1 : 0);
            case DATE -> 10L;
            case TIME -> 8L;
            case TIMESTAMP -> (long) TIMESTAMP_TEXT_LENGTH;
            case BOOLEAN -> 5L;
            case UUID -> 36L;
            default -> null;
        };
    }

    boolean isExactNumeric() {
        return family == Family.INTEGER || family == Family.DECIMAL;
    }

    /** 이 값을 타깃 종류에 바인딩할 수 있는가. 손실이 조용히 생기는 조합은 막는다. */
    boolean compatibleWith(Family target) {
        return switch (family) {
            case TEXT -> target == Family.TEXT;
            case INTEGER, DECIMAL -> target == Family.INTEGER || target == Family.DECIMAL
                    || target == Family.APPROXIMATE || target == Family.TEXT;
            case APPROXIMATE -> target == Family.APPROXIMATE || target == Family.TEXT;
            case DATE -> target == Family.DATE || target == Family.TIMESTAMP;
            case UUID -> target == Family.UUID || target == Family.TEXT;
            case BOOLEAN, TIME, TIMESTAMP, TIMESTAMPTZ, BINARY -> target == family;
            case OTHER, UNKNOWN -> false;
        };
    }

    /** 정수 순위의 최대 자릿수(tinyint 3, smallint 5, integer 10, bigint 19). */
    static int digits(int rank) {
        return switch (rank) {
            case 1 -> 3;
            case 2 -> 5;
            case 3 -> 10;
            default -> 19;
        };
    }

    /** 정수 순위가 언제나 담을 수 있는 자릿수(smallint 4, integer 9, bigint 18). */
    static int safeDigits(int rank) {
        return switch (rank) {
            case 2 -> 4;
            case 3 -> 9;
            default -> 18;
        };
    }

    private static TargetValueDomain integer(int rank) {
        return new TargetValueDomain(Family.INTEGER, null, rank, digits(rank), 0, false, false, false);
    }

    private static TargetValueDomain decimal(Integer intDigits, Integer scale) {
        return new TargetValueDomain(Family.DECIMAL, null, null, intDigits, scale, false, false, false);
    }

    private static TargetValueDomain text(Long maxChars) {
        return new TargetValueDomain(Family.TEXT, maxChars, null, null, null, false, false, false);
    }

    private static TargetValueDomain plain(Family family) {
        return new TargetValueDomain(family, null, null, null, null, false, false, false);
    }

    private static TargetValueDomain exemptDomain() {
        return new TargetValueDomain(Family.UNKNOWN, null, null, null, null, true, false, false);
    }

    private static Integer integerAttribute(CatalogObject source, String name) {
        Long value = longAttribute(source, name);
        return value == null || value > Integer.MAX_VALUE || value < Integer.MIN_VALUE ? null : value.intValue();
    }

    private static Long longAttribute(CatalogObject source, String name) {
        String value = source.attributes().get(name);
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException invalid) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
