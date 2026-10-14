package nuri.migration.validate;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.model.MappingSpec.CodeMap;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.NullPolicy;
import nuri.migration.model.MappingSpec.UnmappedPolicy;

import java.sql.Types;
import java.util.EnumSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import java.util.regex.Pattern;

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

    /**
     * 값·타깃 공통 종류. UNKNOWN 은 소스 선언을 확인하지 못한 값, OTHER 는 지원하지 않는 타깃 타입이다.
     * TIMESTAMPTZ·TIMETZ 는 시간대가 있는 값으로, 시간대 없는 종류와 섞지 않는다(ADR-0029 L3a-1).
     */
    enum Family {
        TEXT, INTEGER, DECIMAL, APPROXIMATE, BOOLEAN, DATE, TIME, TIMETZ, TIMESTAMP, TIMESTAMPTZ, BINARY, UUID,
        OTHER, UNKNOWN
    }

    private static final int TIMESTAMP_TEXT_LENGTH = 29;

    /** 타입 이름의 정밀도 표기, 예: {@code TIMESTAMP(6) WITH TIME ZONE}. */
    private static final Pattern PRECISION = Pattern.compile("\\(\\s*\\d+\\s*\\)");
    /** Oracle TIMESTAMPTZ(-101)·TIMESTAMPLTZ(-102), SQL Server DATETIMEOFFSET(-155) 는 드라이버 고유 번호다. */
    private static final Set<Integer> ZONED_JDBC_TYPES = Set.of(
            Types.TIME_WITH_TIMEZONE, Types.TIMESTAMP_WITH_TIMEZONE, -101, -102, -155);
    private static final Set<String> ZONED_NATIVE_TYPES = Set.of(
            "timestamptz", "timetz", "timestampltz", "datetimetz", "datetimeltz", "datetimeoffset");
    /**
     * 세션 시간대로 바꿔 읽는 제품의 {@code TIMESTAMP}. MySQL·MariaDB 의 TIMESTAMP 는 UTC 로 저장하고 세션
     * {@code time_zone} 으로 바꿔 돌려주므로 이름만으로는 PostgreSQL 의 시간대 없는 {@code timestamp} 와 갈리지 않는다
     * — 소스 제품 이름과 함께 본다.
     */
    private static final Set<String> SESSION_ZONED_PRODUCTS = Set.of("mysql", "mariadb");

    private static final Set<Family> DATE_INPUTS =
            EnumSet.of(Family.TEXT, Family.INTEGER, Family.DECIMAL, Family.DATE, Family.TIMESTAMP);
    private static final Set<Family> DATE_TIME_INPUTS =
            EnumSet.of(Family.TEXT, Family.INTEGER, Family.DECIMAL, Family.TIMESTAMP);
    private static final Map<String, Set<Family>> DOMAIN_INPUTS = Map.of(
            "ymd8", DATE_INPUTS, "ymd8-truncate", DATE_INPUTS, "date-text", DATE_INPUTS,
            "date-truncate", DATE_INPUTS, "timestamp-from-date", DATE_INPUTS,
            "ymdhms14", DATE_TIME_INPUTS, "timestamp-text", DATE_TIME_INPUTS,
            "hms6", EnumSet.of(Family.TEXT, Family.INTEGER, Family.DECIMAL, Family.TIME),
            "yn", EnumSet.of(Family.TEXT, Family.BOOLEAN));

    /** {@code sourceProduct} 는 승인 inventory 의 소스 제품 이름이다(시간대 판정, {@link #zoneAware}). */
    static TargetValueDomain of(ColumnMapping mapping, Map<String, CodeMap> codemaps,
                                Predicate<String> builtinTransformer, CatalogObject source, String sourceProduct) {
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
        TargetValueDomain value = fromSource(source, sourceProduct);
        if (!isBlank(mapping.transform())) {
            if (!builtinTransformer.test(mapping.transform())) {
                return exemptDomain();
            }
            value = switch (mapping.transform()) {
                case "date", "date-truncate", "date-text" -> plain(Family.DATE);
                case "timestamp", "timestamp-text", "timestamp-from-date" -> plain(Family.TIMESTAMP);
                // [ADR-0029 L3a-1] 표준 도메인 변환기는 소스 길이와 무관하게 표준 표기 길이를 낸다.
                case "ymd8", "ymd8-truncate" -> text(8L);
                case "ymdhms14" -> text(14L);
                case "hms6" -> text(6L);
                case "yn" -> text(1L);
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

    /**
     * 승인 inventory 의 JDBC 컬럼 선언(jdbcType·size·scale)으로 소스 값의 종류를 정한다. 시간대가 있는 일시·시각
     * ({@link #zoneAware})은 TIMESTAMPTZ·TIMETZ 로 따로 둔다 — 그대로 옮겨도 시간대 없는 컬럼에 쓰면 실행 환경의
     * 시간대로 값이 정해지기 때문이다(ADR-0029 L3a-1).
     */
    static TargetValueDomain fromSource(CatalogObject source, String sourceProduct) {
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
            // PostgreSQL 드라이버는 timetz·timestamptz 를 TIME·TIMESTAMP 로, MySQL·MariaDB 는 세션 시간대로 바꾸는
            //   TIMESTAMP 를 TIMESTAMP 로 알린다 — 타입 이름과 제품으로 시간대를 가린다(ADR-0029 L3a-1).
            case Types.TIME -> plain(zoneAware(source, sourceProduct) ? Family.TIMETZ : Family.TIME);
            case Types.TIME_WITH_TIMEZONE -> plain(Family.TIMETZ);
            case Types.TIMESTAMP -> plain(zoneAware(source, sourceProduct) ? Family.TIMESTAMPTZ : Family.TIMESTAMP);
            case Types.TIMESTAMP_WITH_TIMEZONE -> plain(Family.TIMESTAMPTZ);
            case Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY, Types.BLOB -> plain(Family.BINARY);
            default -> plain(Family.UNKNOWN);
        };
    }

    /**
     * 시간대가 있는 소스 컬럼인가. 그 값은 실행 환경(JVM·세션)의 시간대로 지역 날짜·시각이 정해지므로 변환하거나
     * 시간대 없는 컬럼에 옮기면 조용히 달라진다(ADR-0029 L3a-1). JDBC 타입과 드라이버의 타입 이름({@code nativeType})
     * 둘 다 본다 — PostgreSQL 은 {@code timestamptz}·{@code timetz} 를 TIMESTAMP·TIME 으로, Oracle·SQL Server 는
     * 드라이버 고유 번호로 알린다. MySQL·MariaDB 의 {@code TIMESTAMP} 는 소스 제품 이름으로 가린다.
     */
    static boolean zoneAware(CatalogObject source, String sourceProduct) {
        if (source == null) {
            return false;
        }
        Integer jdbcType = integerAttribute(source, "jdbcType");
        if (jdbcType != null && ZONED_JDBC_TYPES.contains(jdbcType)) {
            return true;
        }
        String nativeType = source.attributes().get("nativeType");
        if (nativeType == null) {
            return false;
        }
        String type = PRECISION.matcher(nativeType.toLowerCase(Locale.ROOT)).replaceAll("")
                .replaceAll("\\s+", " ").trim();
        return ZONED_NATIVE_TYPES.contains(type) || type.contains("with time zone")
                || type.contains("with local time zone")
                || ("timestamp".equals(type) && sessionZonedProduct(sourceProduct));
    }

    private static boolean sessionZonedProduct(String sourceProduct) {
        if (sourceProduct == null) {
            return false;
        }
        String product = sourceProduct.toLowerCase(Locale.ROOT);
        return SESSION_ZONED_PRODUCTS.stream().anyMatch(product::contains);
    }

    /**
     * 표준 도메인 변환기가 받는 소스 값 종류(ADR-0029 L3a-1). 도메인 변환기가 아니면 null. 표에 없는 종류는 실행하면
     * 모든 행이 거부되는 조합이라 적재 전에 막는다 — 시간대가 있는 소스는 {@link #zoneAware} 가 먼저 막는다.
     */
    static Set<Family> domainInputs(String transform) {
        return transform == null ? null : DOMAIN_INPUTS.get(transform);
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

    /**
     * 보호 컬럼({@code encrypt})이 실제로 쓰는 값 — 평문이 아니라 Base64 암호문이다(DEC-OPS-308). 평문 길이를
     * 모르면 길이도 모른다.
     */
    TargetValueDomain encrypted() {
        Long plaintext = textLength();
        return text(plaintext == null ? null : ciphertextLength(plaintext));
    }

    /**
     * 평문 {@code chars} 자의 최대 암호문 길이. 한 글자는 UTF-8 로 최대 4바이트이고, 16바이트 블록으로 채운 뒤
     * Base64 로 쓴다(13자 주민번호 → 88자).
     */
    static long ciphertextLength(long chars) {
        long bytes = Math.max(1L, chars) * 4L;
        long padded = (bytes + 15L) / 16L * 16L;
        return 4L * ((padded + 2L) / 3L);
    }

    /** idStrategy 가 만드는 표준 ID — 그 컬럼과, 길이를 아는 fkRef 값(부모의 표준 ID)이다. */
    static TargetValueDomain generatedKey(long chars) {
        return new TargetValueDomain(Family.TEXT, chars, null, null, null, false, false, true);
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
            // [ADR-0029 L3a-1] 날짜를 timestamp 컬럼에 쓰면 DB 는 받지만 되읽은 일시와 checksum 이 어긋난다 —
            //   그날 00:00 일시로 쓰려면 timestamp-from-date 를 선언한다.
            case DATE -> target == Family.DATE;
            case UUID -> target == Family.UUID || target == Family.TEXT;
            // 시간대 있는 값과 없는 값은 서로 옮기지 않는다 — 어느 쪽이든 실행 환경의 시간대가 값을 정한다.
            case BOOLEAN, TIME, TIMETZ, TIMESTAMP, TIMESTAMPTZ, BINARY -> target == family;
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
