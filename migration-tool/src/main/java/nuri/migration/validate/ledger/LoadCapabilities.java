package nuri.migration.validate.ledger;

import nuri.migration.discovery.CatalogObject;
import nuri.migration.domain.DomainCategory;
import nuri.migration.domain.DomainViolation;
import nuri.migration.model.MappingSpec;
import nuri.migration.transform.TransformerRegistry;
import nuri.migration.transform.TypeConverter;
import nuri.migration.validate.ledger.TermLedger.Load;

import java.sql.Types;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 원장 확정 행의 {@code load} 가 실행 때 무엇을 판정하는지의 표(ADR-0029 L3a-2). 원장 검증기는 이 표로 "기록된 위반마다
 * 실행 시점 처리가 있는가" 와 "셀 수 없었던 위반마다 행 단위 판정이 있는가" 를 정한다.
 *
 * <p>값 하나는 실행기에서 {@code transform → codemap → type} 순서로 판정된다. 그래서 표준 도메인 변환기가 거부한 값은
 * 그 위반 코드로, codemap 이 받지 못한 값은 {@code CODEMAP_UNMAPPED} 로, 비문자 type 이 받지 못한 값은 공백이면
 * {@code BLANK}·나머지는 {@code FORMAT} 으로 멈춘다(설계서 격리 어휘 대응표). 변환기 이름과 낼 수 있는 위반은 기본
 * {@link TransformerRegistry} 의 내장 정의를 정본으로 쓴다 — 같은 이름을 프로젝트 변환기로 덮어쓰는 일은 mapping 검증이
 * 따로 막는다.</p>
 */
public final class LoadCapabilities {

    /** 추정기가 행 수로 세는 위반 — 원장 {@code conformance.violations} 의 어휘. */
    public static final Set<String> COUNTED = Set.of("BLANK", "PLACEHOLDER_DATE", "INVALID_DATE", "FORMAT",
            "NOT_ALLOWED");
    /** 추정기가 적합률을 비우게 한 이유 — 원장 {@code conformance.unmeasured} 의 어휘. */
    public static final Set<String> UNMEASURED = Set.of("UNSUPPORTED_VALUE_TYPE", "LENGTH_EXCEEDED",
            "LENGTH_UNVERIFIED", "ALLOWED_VALUES_UNVERIFIED", "SAMPLED");
    /** 승인 예외로 격리할 수 있는 위반 코드(설계서 격리 어휘 대응표와 값 한계 가드 코드). */
    public static final Set<String> ISOLATABLE = Set.of("INVALID_DATE", "PLACEHOLDER_DATE", "TIME_PRESENT",
            "FORMAT", "BLANK", "CODEMAP_UNMAPPED", "LENGTH_EXCEEDED", "PRECISION_EXCEEDED", "REQUIRED_MISSING");
    /** 원장 행 하나가 승인할 수 있는 예외 행 수의 상한. */
    public static final long MAX_EXCEPTION_ROWS = 1000;
    /** 변환 힌트 어휘. */
    public static final String HINT_CODEMAP = "codemap";
    public static final String HINT_MIXED = "mixed";
    public static final String TRANSFORM_HINT = "transform:";
    public static final String TYPE_HINT = "type:";
    static final String CODEMAP_UNMAPPED = "CODEMAP_UNMAPPED";

    /** 시각을 버리거나 자정을 붙여 값을 바꾸는 규칙 정제 변환기 — 원장에 사유(note)가 필요하다. */
    private static final Set<String> REFINING = Set.of("ymd8-truncate", "date-truncate", "timestamp-from-date");
    /** 표준 도메인 변환기가 아닌 내장 날짜·일시 파서. 읽지 못한 문자는 {@code FORMAT} 으로 멈춘다. */
    private static final Set<String> PARSERS = Set.of("date", "timestamp");
    private static final Set<String> TEMPORAL_TYPES = Set.of("date", "timestamp", "datetime");
    /**
     * 고정 길이 문자 소스의 codemap 앞에 trim 이 없을 때의 사유(ADR-0029 L4-B R3). 생성기와 coverage 가 같은 문구를 쓴다.
     */
    public static final String FIXED_WIDTH_TRIM_REQUIRED = "고정 길이 문자(CHAR·NCHAR) 소스의 codemap 앞에는"
            + " transform: trim 이 필요합니다 — 공백으로 채운 값은 codemap 키와 맞지 않아, unmapped: fail 이면 실행에서"
            + " CODEMAP_UNMAPPED 로 멈추고 passthrough·fallback 이면 그 값이 그대로 가거나 대체값이 됩니다(적합성 추정은"
            + " 공백을 깎아 셉니다)";
    /** 드라이버가 알리는 고정 길이 문자 타입 이름(정밀도 표기를 뺀 소문자). PostgreSQL 은 {@code bpchar} 로 알린다. */
    private static final Set<String> FIXED_WIDTH_CHARACTER = Set.of("char", "nchar", "bpchar", "character",
            "national char", "national character");
    /** fkRef 컬럼이 받는 키 정규화 변환기 — CHAR 공백 채움 자식 키를 VARCHAR 부모 키와 맞출 때 쓴다. */
    private static final Set<String> KEY_TRANSFORMS = Set.of("trim", "upper", "lower");
    private static final Set<DomainViolation> NULLIFY_CODES = EnumSet.of(DomainViolation.BLANK,
            DomainViolation.PLACEHOLDER_DATE);
    /** 도메인 범주가 요구하는 변환기. 여부 범주는 codemap 으로도 된다. */
    private static final Map<DomainCategory, List<String>> GUARD = Map.of(
            DomainCategory.DATE8, List.of("ymd8", "ymd8-truncate"),
            DomainCategory.DATETIME14, List.of("ymdhms14"),
            DomainCategory.TIME6, List.of("hms6"),
            DomainCategory.YN, List.of("yn"));
    private static final Pattern CODEMAP_NAME = Pattern.compile("[A-Za-z0-9_.-]{1,64}");
    private static final Pattern ALLOWED_CODE = Pattern.compile("(?:^|,)\\s*([A-Za-z0-9]{1,12})\\s*:");

    private final TransformerRegistry transformers;

    public LoadCapabilities() {
        this(new TransformerRegistry());
    }

    LoadCapabilities(TransformerRegistry transformers) {
        this.transformers = Objects.requireNonNull(transformers, "transformers");
    }

    /** 내장 변환기 이름인가. */
    public boolean builtin(String name) {
        return transformers.isBuiltin(name);
    }

    /** 표준 도메인 변환기인가. */
    public boolean domain(String name) {
        return transformers.isDomain(name);
    }

    /** codemap 이름 형식인가. */
    public static boolean codemapName(String name) {
        return name != null && CODEMAP_NAME.matcher(name).matches();
    }

    /**
     * 변환 힌트가 mapping 어휘인가 — {@code transform:<내장 변환기>}·{@code type:<type>}(소문자)·{@code codemap}·
     * {@code mixed}·없음.
     */
    public boolean hint(String hint) {
        if (hint == null || hint.equals(HINT_CODEMAP) || hint.equals(HINT_MIXED)) {
            return true;
        }
        if (hint.startsWith(TRANSFORM_HINT)) {
            return builtin(hint.substring(TRANSFORM_HINT.length()));
        }
        if (hint.startsWith(TYPE_HINT)) {
            String type = hint.substring(TYPE_HINT.length());
            return type.equals(type.toLowerCase(Locale.ROOT)) && TypeConverter.isKnown(type);
        }
        return false;
    }

    /** 힌트가 내장 변환기 하나로 정해지면 그 이름, 아니면 null. 원장 초안이 load 를 미리 채울 때 쓴다. */
    public String builtinOf(String hint) {
        if (hint == null || !hint.startsWith(TRANSFORM_HINT)) {
            return null;
        }
        String name = hint.substring(TRANSFORM_HINT.length());
        return builtin(name) ? name : null;
    }

    /**
     * nullify 로 NULL 로 바꿀 수 있는 위반. mapping 검증과 같은 판정이다 — 표준 도메인 변환기가 낼 수 있는
     * {@code BLANK}·{@code PLACEHOLDER_DATE} 와, 비문자 type 의 {@code BLANK}.
     */
    public Set<DomainViolation> nullifiable(Load load) {
        Set<DomainViolation> producible = EnumSet.noneOf(DomainViolation.class);
        if (load == null) {
            return producible;
        }
        for (DomainViolation violation : transformers.domainViolations(load.transform())) {
            if (NULLIFY_CODES.contains(violation)) {
                producible.add(violation);
            }
        }
        if (TypeConverter.isNonTextType(load.type())) {
            producible.add(DomainViolation.BLANK);
        }
        return producible;
    }

    /** nullify 에 선언할 수 있는 위반인가({@code BLANK}·{@code PLACEHOLDER_DATE}). */
    public static boolean nullifyCode(DomainViolation violation) {
        return violation != null && NULLIFY_CODES.contains(violation);
    }

    /**
     * 추정기가 기록한 위반 {@code recorded} 를 가진 값이 이 load 에서 실행 때 받는 코드. load 가 그 값을 판정하지
     * 않으면(그대로 대상에 간다) null 이다. codemap 은 {@code unmapped: fail} 이라고 본다 — 그 정의는 mapping 과 함께
     * {@link TermLedgerValidator#codemaps} 가 확인한다.
     */
    public String runtimeCode(Load load, String recorded) {
        if (load == null || recorded == null || recorded.equals("NOT_ALLOWED")) {
            return null;
        }
        if (domain(load.transform())) {
            for (DomainViolation violation : transformers.domainViolations(load.transform())) {
                if (violation.name().equals(recorded)) {
                    return recorded;
                }
            }
            return DomainViolation.FORMAT.name();
        }
        if (load.transform() != null && PARSERS.contains(load.transform()) && builtin(load.transform())) {
            return recorded.equals("PLACEHOLDER_DATE") ? null : DomainViolation.FORMAT.name();
        }
        if (load.codemap() != null) {
            return CODEMAP_UNMAPPED;
        }
        if (TypeConverter.isNonTextType(load.type())) {
            String type = load.type().toLowerCase(Locale.ROOT);
            return switch (recorded) {
                case "BLANK" -> DomainViolation.BLANK.name();
                case "FORMAT" -> DomainViolation.FORMAT.name();
                case "INVALID_DATE" -> TEMPORAL_TYPES.contains(type) ? DomainViolation.FORMAT.name() : null;
                default -> null;
            };
        }
        return null;
    }

    /**
     * 추정기가 판정하지 못한 값 종류(LOB·이진 등)를 행마다 판정하는가 — 표준 도메인 변환기는 위반 코드로, type 은
     * 변환 실패로 그런 값을 거부한다. 문자 type 도 이진·XML·구조·배열·참조·ROWID·스트림 객체는 거부하고 문자로 읽은
     * LOB 만 받는다({@link TypeConverter}).
     */
    public boolean judgesValueType(Load load) {
        return load != null && (domain(load.transform()) || TypeConverter.isKnown(load.type()));
    }

    /** 도메인 범주가 요구하는 처리를 가졌는가. 가드가 없는 범주는 늘 맞다. */
    public boolean guarded(DomainCategory category, Load load) {
        List<String> required = GUARD.get(category);
        if (required == null) {
            return true;
        }
        if (load == null) {
            return false;
        }
        return (load.transform() != null && required.contains(load.transform()))
                || (category == DomainCategory.YN && load.codemap() != null && !domain(load.transform()));
    }

    /** 도메인 범주가 요구하는 처리의 이름(오류 문구용). 가드가 없으면 null. */
    public static String guardLabel(DomainCategory category) {
        List<String> required = GUARD.get(category);
        if (required == null) {
            return null;
        }
        String transforms = String.join(" 또는 ", required);
        return category == DomainCategory.YN ? transforms + " 또는 codemap" : transforms;
    }

    /**
     * 공통표준 허용값 원문에서 코드만 꺼낸다. 목록이 잘려 있거나({@code …}) 코드 목록으로 읽을 수 없으면 비운다 —
     * 호출자는 빈 집합을 "허용값을 확인하지 못했다" 로 다룬다. 적합성 추정기와 원장의 codemap 대조가 함께 쓴다.
     */
    public static Set<String> allowedCodes(String allowedValues) {
        Set<String> codes = new LinkedHashSet<>();
        if (allowedValues == null || allowedValues.contains("…") || allowedValues.contains("...")) {
            return codes;
        }
        Matcher code = ALLOWED_CODE.matcher(allowedValues);
        while (code.find()) {
            codes.add(code.group(1));
        }
        return codes;
    }

    /**
     * fkRef 컬럼이 받을 수 있는 load 인가 — 키를 정규화하는 처리(trim·upper·lower·문자 type)만이다. 표준 도메인
     * 변환기·codemap·nullify 는 부모 키를 바꾼다. 생성기와 coverage 가 같은 판정을 쓴다.
     */
    public static boolean keyNormalization(Load load) {
        return load != null && load.codemap() == null && load.nullify().isEmpty()
                && (load.transform() == null || KEY_TRANSFORMS.contains(load.transform()))
                && (load.type() == null
                || (TypeConverter.isKnown(load.type()) && !TypeConverter.isNonTextType(load.type())));
    }

    /**
     * 고정 길이 문자 소스의 codemap 이 공백을 깎지 않고 대조하는가(ADR-0029 L4-B R3) — codemap 이 있고 transform 이
     * {@code trim} 이 아니며 소스가 {@link #fixedWidthCharacter} 다. 표준 도메인 변환기는 원장이 codemap 과 함께 쓰지 못하게
     * 하므로 공백을 깎는 앞 처리는 trim 하나다. 생성기(원장 load)와 coverage(mapping 컬럼)가 같은 판정을 쓴다 — 생성기를 거치지
     * 않은 mapping 도 plan·load 에서 막힌다.
     */
    public static boolean untrimmedFixedWidthCodemap(String transform, String codemap, CatalogObject sourceColumn) {
        return codemap != null && !"trim".equals(transform) && fixedWidthCharacter(sourceColumn);
    }

    /**
     * inventory 원래 타입이 공백으로 채워 오는 고정 길이 문자인가. 드라이버가 알린 타입 이름({@code nativeType})으로 정하고,
     * 이름이 없을 때만 JDBC 타입(CHAR·NCHAR)으로 정한다 — SQL Server {@code uniqueidentifier}·MySQL {@code ENUM} 처럼 JDBC
     * CHAR 로 알리지만 공백을 채우지 않는 타입은 이름으로 가린다. 선언 길이({@code size})가 1 이면 아니다 — 값이 있으면 늘 꽉
     * 차서 공백이 붙지 않고, 공백 하나뿐인 값은 trim 해도 codemap 키와 맞지 않는다. MySQL·MariaDB 는 기본 설정에서 조회 때 끝
     * 공백을 지우지만 세션 sql_mode({@code PAD_CHAR_TO_FULL_LENGTH})를 inventory 가 담지 않아 다른 vendor 와 같이 본다.
     */
    static boolean fixedWidthCharacter(CatalogObject column) {
        if (column == null) {
            return false;
        }
        String size = column.attributes().get("size");
        if (size != null && size.trim().equals("1")) {
            return false;
        }
        String nativeType = column.attributes().get("nativeType");
        if (nativeType != null && !nativeType.isBlank()) {
            String type = nativeType.toLowerCase(Locale.ROOT).replaceAll("\\(.*\\)", " ").replaceAll("\\s+", " ")
                    .trim();
            return FIXED_WIDTH_CHARACTER.contains(type);
        }
        String jdbcType = column.attributes().get("jdbcType");
        return String.valueOf(Types.CHAR).equals(jdbcType) || String.valueOf(Types.NCHAR).equals(jdbcType);
    }

    /** 값을 정해진 규칙으로 바꾸는 load 인가 — 시각 버림·자정 붙임 변환기나 nullify. 원장 사유(note)가 필요하다. */
    public boolean refines(Load load) {
        return load != null && ((load.transform() != null && REFINING.contains(load.transform()))
                || !load.nullify().isEmpty());
    }

    /**
     * 확정 행이 mapping 컬럼에 옮길 승인 행 격리(ADR-0029 L3b). 승인 예외의 위반 가운데 load 의 nullify 가 NULL 로 바꾸는
     * 위반은 행이 실패하지 않으므로 뺀다. 남는 위반이 없거나 승인 예외가 없으면 null 이다. 생성기와 coverage 가 같은
     * 판정을 쓴다 — 원장 순서를 그대로 둬 같은 원장은 같은 mapping 을 낸다.
     */
    public static MappingSpec.Isolate isolate(TermLedger.Entry entry) {
        if (entry == null || entry.conformance() == null || entry.conformance().approvedExceptions() == null) {
            return null;
        }
        TermLedger.ApprovedExceptions approved = entry.conformance().approvedExceptions();
        List<String> violations = approved.violations().stream()
                .filter(code -> !nullifies(entry.load(), code))
                .toList();
        return violations.isEmpty() ? null : new MappingSpec.Isolate(entry.id(), approved.maxRows(), violations);
    }

    private static boolean nullifies(Load load, String code) {
        if (load == null || code == null) {
            return false;
        }
        for (MappingSpec.Nullify rule : load.nullify()) {
            if (rule.violation() != null && rule.violation().name().equals(code)) {
                return true;
            }
        }
        return false;
    }

    /** load 가 nullify 를 선언했는가. */
    static boolean nullified(Load load, DomainViolation violation) {
        if (load == null) {
            return false;
        }
        for (MappingSpec.Nullify rule : load.nullify()) {
            if (rule.violation() == violation) {
                return true;
            }
        }
        return false;
    }
}
