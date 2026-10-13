package nuri.migration.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * {@code mapping.yml} 바인딩 모델 — 레거시 소스 → 표준 스키마 이관 선언(진실원천).
 *
 * <p>설계: {@code docs/02-architecture/legacy-migration-tool-design.md} (Phase 4a).
 * 소스/타깃 접속과 테이블·컬럼 매핑, 코드값 매핑을 선언적으로 표현한다.
 */
public record MappingSpec(
        DbConfig source,
        DbConfig target,
        List<TableMapping> tables,
        Map<String, CodeMap> codemaps,
        RunContext run
) {

    /** 기존 dry-run/단위 테스트 호환 생성자. COMMIT은 명시적 run 계약을 별도로 강제한다. */
    public MappingSpec(DbConfig source, DbConfig target, List<TableMapping> tables,
                       Map<String, CodeMap> codemaps) {
        this(source, target, tables, codemaps, null);
    }

    public MappingSpec {
        tables = tables == null ? List.of() : tables;
        codemaps = codemaps == null ? Map.of() : codemaps;
    }

    /** JDBC 접속 정보(소스/타깃 공통). */
    public record DbConfig(
            String url,
            String username,
            String password,
            String driver,
            String endpointId
    ) {
        /** endpoint binding 도입 전 mapping/test source compatibility. 승인 workflow에서는 endpointId를 강제한다. */
        public DbConfig(String url, String username, String password, String driver) {
            this(url, username, password, driver, null);
        }

        /** record 기본 toString이 접속정보를 노출하지 않도록 모든 값 표현을 고정 redaction한다. */
        @Override
        public String toString() {
            return "DbConfig[url=<redacted>, username=<redacted>, password=<redacted>, "
                    + "driver=<redacted>, endpointId=<redacted>]";
        }
    }

    /** 재시작 가능한 이관 실행의 영속 identity. 두 값 모두 COMMIT에서 필수다. */
    public record RunContext(String runId, String sourceNamespace) {}

    /** 소스 테이블 → 타깃 테이블 매핑. */
    public record TableMapping(
            String source,
            String target,
            String where,
            String orderBy,
            List<String> orderByKeys,
            String targetKey,
            List<ColumnMapping> columns,
            IdStrategy idStrategy,
            IdentityStrategy identity,
            List<CompositeForeignKey> foreignKeys
    ) {
        /** identity DSL 도입 전 canonical 생성자 호환. */
        public TableMapping(String source, String target, String where, String orderBy,
                            List<String> orderByKeys, String targetKey,
                            List<ColumnMapping> columns, IdStrategy idStrategy) {
            this(source, target, where, orderBy, orderByKeys, targetKey, columns, idStrategy,
                    null, List.of());
        }

        /** P1 단일키 DSL 호환 생성자. */
        public TableMapping(String source, String target, String where, String orderBy,
                            String targetKey, List<ColumnMapping> columns, IdStrategy idStrategy) {
            this(source, target, where, orderBy, List.of(), targetKey, columns, idStrategy,
                    null, List.of());
        }

        /** 기존 dry-run/검증 호출부 호환 생성자. COMMIT은 orderBy를 별도로 강제한다. */
        public TableMapping(String source, String target, String where,
                            List<ColumnMapping> columns, IdStrategy idStrategy) {
            this(source, target, where, null, List.of(), null, columns, idStrategy,
                    null, List.of());
        }

        public TableMapping {
            orderByKeys = orderByKeys == null ? List.of() : List.copyOf(orderByKeys);
            columns = columns == null ? List.of() : columns;
            foreignKeys = foreignKeys == null ? List.of() : List.copyOf(foreignKeys);
        }

        /** 새 복합키가 없으면 기존 단일 {@code orderBy}를 그대로 사용한다. */
        public List<String> effectiveOrderKeys() {
            if (!orderByKeys.isEmpty()) {
                return orderByKeys;
            }
            return orderBy == null || orderBy.isBlank() ? List.of() : List.of(orderBy);
        }
    }

    /**
     * 컬럼 매핑. {@code source} 없이 {@code constant} 만 있으면 상수 주입(표준 감사컬럼 등).
     * {@code transform}(변환기명)·{@code codemap}(코드맵명)·{@code type}(타입변환 힌트)은 선택.
     * 적용 순서는 {@code transform → codemap → type → fkRef} 다 — {@code trim} 같은 정리가 코드 대조보다
     * 먼저 와야 CHAR 패딩 코드가 미매핑으로 빠지지 않는다(2026-10-13 DEC-OPS-309).
     * {@code fkRef}(부모 소스 테이블명)가 있으면 이 컬럼의 소스 값을 그 부모의 키맵으로 번역해
     * 신규 대리키(esntl_id 등)로 재작성한다 — 부모 PK 재생성 시 자식 FK 무결성 보존의 핵심.
     */
    public record ColumnMapping(
            String source,
            String target,
            String transform,
            String type,
            String codemap,
            String fkRef,
            @JsonProperty("const") String constant
    ) {}

    /**
     * 레거시 코드 → 표준 코드 대응. {@code values} 에 없는 코드는 {@code unmapped} 정책을 따른다.
     *
     * <p>[2026-10-13 DEC-OPS-309] 기본은 {@link UnmappedPolicy#FAIL} 이다. 종전에는 미매핑 코드가 그대로
     * 통과해 표준 코드 컬럼에 비표준 코드가 조용히 들어갔고, 대체값을 {@code default} 라는 키로 두어
     * 레거시 코드값 {@code default} 와 겹쳤다. 이제 대체값은 {@code fallback} 필드로, 그대로 통과는
     * {@code unmapped: passthrough} 로 따로 선언한다. 옛 평면 형식(코드를 바로 나열)은 읽지 않는다 —
     * 의미가 바뀐 파일을 조용히 다르게 해석하지 않으려는 것이다({@link CodemapFormatException}).
     *
     * <p>원천 NULL 은 코드가 아니므로 기본으로 NULL 이다({@link NullPolicy#KEEP}). 옛 형식의 {@code default} 는
     * NULL 도 대체값으로 바꿨으므로, 그 의미가 필요하면 {@code nullAs: fallback} 으로 밝힌다.
     */
    public record CodeMap(Map<String, String> values, UnmappedPolicy unmapped, String fallback, NullPolicy nullAs) {

        /** YAML codemap 이 쓰는 필드. {@code values} 가 맵이 아닌데 이 밖의 키가 보이면 옛 평면 형식으로 본다. */
        public static final Set<String> FIELDS = Set.of("values", "unmapped", "fallback", "nullAs");

        /** {@code nullAs} 이전 호출부 호환 — NULL 은 NULL 이다. */
        public CodeMap(Map<String, String> values, UnmappedPolicy unmapped, String fallback) {
            this(values, unmapped, fallback, NullPolicy.KEEP);
        }

        public CodeMap {
            LinkedHashMap<String, String> copy = new LinkedHashMap<>();
            if (values != null) {
                for (Map.Entry<String, String> entry : values.entrySet()) {
                    if (entry.getKey() == null || entry.getValue() == null) {
                        throw new IllegalArgumentException("codemap 코드와 표준 코드는 null 일 수 없습니다");
                    }
                    copy.put(entry.getKey(), entry.getValue());
                }
            }
            values = Collections.unmodifiableMap(copy);
            unmapped = unmapped == null ? UnmappedPolicy.FAIL : unmapped;
            nullAs = nullAs == null ? NullPolicy.KEEP : nullAs;
        }

        /** 미매핑 코드를 실패시키는 기본 정의. */
        public static CodeMap of(Map<String, String> values) {
            return new CodeMap(values, UnmappedPolicy.FAIL, null);
        }

        /** mapping.yml 의 codemap 한 항목을 읽는다. 형식 오류는 값이 아니라 고정 문구로 알린다. */
        @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
        public static CodeMap fromMapping(Map<String, Object> raw) {
            if (raw == null) {
                throw new CodemapFormatException("codemap 정의가 비어 있습니다 — values 를 선언하십시오.");
            }
            for (String key : raw.keySet()) {
                if (key == null || !FIELDS.contains(key)) {
                    // values 가 맵이면 새 형식의 필드 오타다. 아니면 코드를 바로 나열한 옛 평면 형식이다.
                    throw raw.get("values") instanceof Map<?, ?>
                            ? CodemapFormatException.unknownField(key)
                            : new CodemapFormatException(CodemapFormatException.LEGACY_FLAT_FORM);
                }
            }
            if (!(raw.get("values") instanceof Map<?, ?> rawValues)) {
                throw new CodemapFormatException("codemap 의 values 는 레거시 코드 → 표준 코드 맵이어야 합니다.");
            }
            LinkedHashMap<String, String> values = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : rawValues.entrySet()) {
                // 키(레거시 코드)는 Jackson 이 늘 적은 그대로의 문자열로 준다 — 따옴표 없는 01 도 "01" 이다.
                //   값(표준 코드)만 boolean·숫자로 바뀌어 읽히므로 값만 검사한다.
                if (!(entry.getValue() instanceof String standard)) {
                    throw new CodemapFormatException(CodemapFormatException.NON_TEXT_CODE);
                }
                values.put(Objects.toString(entry.getKey(), null), standard);
            }
            Object unmapped = raw.get("unmapped");
            if (unmapped != null && !(unmapped instanceof String)) {
                throw new CodemapFormatException("codemap 의 unmapped 는 fail·passthrough·fallback 중 하나여야 합니다.");
            }
            Object fallback = raw.get("fallback");
            if (fallback != null && !(fallback instanceof String)) {
                throw new CodemapFormatException(CodemapFormatException.NON_TEXT_CODE);
            }
            UnmappedPolicy policy;
            try {
                policy = unmapped == null ? UnmappedPolicy.FAIL : UnmappedPolicy.parse((String) unmapped);
            } catch (IllegalArgumentException invalid) {
                throw new CodemapFormatException("codemap 의 unmapped 는 fail·passthrough·fallback 중 하나여야 합니다.");
            }
            Object nullAs = raw.get("nullAs");
            if (nullAs != null && !(nullAs instanceof String)) {
                throw new CodemapFormatException(CodemapFormatException.INVALID_NULL_AS);
            }
            NullPolicy nullPolicy;
            try {
                nullPolicy = nullAs == null ? NullPolicy.KEEP : NullPolicy.parse((String) nullAs);
            } catch (IllegalArgumentException invalid) {
                throw new CodemapFormatException(CodemapFormatException.INVALID_NULL_AS);
            }
            return new CodeMap(values, policy, (String) fallback, nullPolicy);
        }
    }

    /** 원천 NULL 을 다루는 방식. 명시하지 않으면 NULL 그대로다. */
    public enum NullPolicy {
        /** NULL 은 코드가 아니므로 NULL 로 둔다(기본). */
        KEEP,
        /** NULL 도 {@code fallback} 값으로 바꾼다 — 옛 평면 형식의 {@code default} 가 NULL 에 하던 일을 밝혀 쓴다. */
        FALLBACK;

        public static NullPolicy parse(String value) {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException("codemap null policy must not be blank");
            }
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        }

        @JsonValue
        public String externalName() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    /** {@code values} 에 없는 코드를 다루는 방식. 명시하지 않으면 실패다. */
    public enum UnmappedPolicy {
        /** 미매핑 코드가 오면 그 행 변환이 실패한다(기본). */
        FAIL,
        /** 미매핑 코드를 그대로 쓴다. 숫자 코드는 정규화한 표기로 쓴다. */
        PASSTHROUGH,
        /** 미매핑 코드를 {@code fallback} 값으로 바꾼다. */
        FALLBACK;

        public static UnmappedPolicy parse(String value) {
            if (value == null || value.isBlank()) {
                throw new IllegalArgumentException("codemap unmapped policy must not be blank");
            }
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        }

        @JsonValue
        public String externalName() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

    /** codemap 형식 오류. 메시지는 고정 문구이며 코드값을 담지 않는다. */
    public static final class CodemapFormatException extends IllegalArgumentException {
        /**
         * 옮겨 쓸 방법과 함께 바뀐 의미 둘을 알린다. 문법만 옮기면 오류 없이 다른 값이 들어가는 경로라서다
         * — NULL 이 대체값 대신 NULL 로 남고, transform 이 codemap 앞으로 왔다.
         */
        public static final String LEGACY_FLAT_FORM = "codemap 의 옛 평면 형식(코드를 바로 나열하고 default 키로 대체값을 두던 형식)은"
                + " 더 이상 읽지 않습니다. 코드는 values 아래로 옮기고, 대체값은 unmapped: fallback 과 fallback,"
                + " 그대로 통과는 unmapped: passthrough 로 선언하십시오. 옮기면서 바뀐 의미 둘을 확인하십시오 —"
                + " ① 종전 default 는 원천 NULL 도 대체값으로 바꿨지만 이제 NULL 은 NULL 로 남습니다."
                + " 종전처럼 바꾸려면 nullAs: fallback 을 함께 선언하십시오."
                + " ② 적용 순서가 codemap → transform 에서 transform → codemap 으로 바뀌어,"
                + " transform 결과로 코드를 찾고 codemap 결과에는 transform 이 적용되지 않습니다(DEC-OPS-309).";
        public static final String NON_TEXT_CODE = "codemap 의 표준 코드(values 의 값)와 fallback 은 따옴표로 감싼 문자열이어야 합니다"
                + " — yes·true·01 같은 값이 boolean·숫자로 읽혀 바뀌는 것을 막습니다."
                + " 레거시 코드(values 의 키)는 적은 그대로 읽습니다.";
        public static final String INVALID_NULL_AS = "codemap 의 nullAs 는 keep·fallback 중 하나여야 합니다.";

        public CodemapFormatException(String message) {
            super(message);
        }

        /** 새 형식(values 가 맵)에 모르는 필드가 섞였다. 필드 이름은 식별자 형식일 때만 싣는다. */
        public static CodemapFormatException unknownField(String name) {
            String label = name != null && name.matches("[A-Za-z][A-Za-z0-9_]{0,31}") ? " '" + name + "'" : "";
            return new CodemapFormatException("codemap 에 알 수 없는 필드" + label
                    + "가 있습니다 — values·unmapped·fallback·nullAs 만 씁니다.");
        }

        /** loader 가 오류 위치의 codemap 이름을 붙인다. 식별자 형식이 아니면 이름을 생략한다. */
        public CodemapFormatException forCodemap(String name) {
            String label = name != null && name.matches("[A-Za-z0-9_.-]{1,64}") ? name : "<이름 생략>";
            return new CodemapFormatException("codemap '" + label + "': " + getMessage());
        }
    }

    /**
     * 표준 ID 생성 전략. {@code column}=타깃 PK 컬럼, {@code generator}=ID prefix,
     * {@code sourceKey}=레거시 PK 를 담은 소스 컬럼(키맵 키로 사용). 생성된 키는 키맵에 적재돼
     * 자식 테이블의 {@code fkRef} 번역에 쓰인다.
     */
    public record IdStrategy(String column, String generator, String sourceKey) {}

    /** identity tuple 구성요소. 선언 순서가 canonical tuple 순서다. */
    public record IdentityComponentSpec(String column, IdentityValueType type) {
        public IdentityComponentSpec {
            Objects.requireNonNull(column, "identity component column");
            if (column.isBlank() || !column.equals(column.trim())) {
                throw new IllegalArgumentException("identity component column must be non-blank and trimmed");
            }
            Objects.requireNonNull(type, "identity component type");
        }
    }

    /** 기존 문자열 idStrategy와 병용하지 않는 typed/composite identity DSL. */
    public record IdentityStrategy(
            TargetIdentityPolicy policy,
            List<IdentityComponentSpec> sourceComponents,
            List<IdentityComponentSpec> targetComponents
    ) {
        public IdentityStrategy {
            Objects.requireNonNull(policy, "identity policy");
            sourceComponents = sourceComponents == null ? List.of() : List.copyOf(sourceComponents);
            targetComponents = targetComponents == null ? List.of() : List.copyOf(targetComponents);
        }
    }

    /** composite 부모 keymap을 여러 자식 target 컬럼으로 번역하는 명시 DSL. */
    public record CompositeForeignKey(
            String parentSource,
            List<IdentityComponentSpec> sourceComponents,
            List<IdentityComponentSpec> targetComponents
    ) {
        public CompositeForeignKey {
            Objects.requireNonNull(parentSource, "composite foreign key parentSource");
            if (parentSource.isBlank() || !parentSource.equals(parentSource.trim())) {
                throw new IllegalArgumentException("composite foreign key parentSource must be non-blank and trimmed");
            }
            sourceComponents = sourceComponents == null ? List.of() : List.copyOf(sourceComponents);
            targetComponents = targetComponents == null ? List.of() : List.copyOf(targetComponents);
        }
    }
}
