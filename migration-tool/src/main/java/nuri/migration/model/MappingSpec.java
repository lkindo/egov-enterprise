package nuri.migration.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

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
        Map<String, Map<String, String>> codemaps,
        RunContext run
) {

    /** 기존 dry-run/단위 테스트 호환 생성자. COMMIT은 명시적 run 계약을 별도로 강제한다. */
    public MappingSpec(DbConfig source, DbConfig target, List<TableMapping> tables,
                       Map<String, Map<String, String>> codemaps) {
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
     * {@code fkRef}(부모 소스 테이블명)가 있으면 이 컬럼의 소스 값을 그 부모의 키맵으로 번역해
     * 신규 대리키(esntl_id 등)로 재작성한다 — 부모 PK 재생성 시 자식 FK 무결성 보존의 핵심.
     *
     * <p>{@code encrypt}(보호 방식 id, 예: {@code aria-egov-v1})는 온라인 앱이 암호화해 저장하는 대상 컬럼에 쓴다.
     * 이관 도구가 온라인 앱과 같은 암호문을 만들어 쓰며, 키는 실행 때 환경 변수로만 받는다(DEC-OPS-308). 비어 있으면
     * 직렬화하지 않아 선언 없는 mapping 의 digest 가 바뀌지 않는다.
     */
    public record ColumnMapping(
            String source,
            String target,
            String transform,
            String type,
            String codemap,
            String fkRef,
            @JsonProperty("const") String constant,
            @JsonInclude(JsonInclude.Include.NON_NULL) String encrypt
    ) {
        /** encrypt 도입 전 생성자 호환. */
        public ColumnMapping(String source, String target, String transform, String type,
                             String codemap, String fkRef, String constant) {
            this(source, target, transform, type, codemap, fkRef, constant, null);
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

    /**
     * 기존 문자열 idStrategy와 병용하지 않는 typed/composite identity DSL.
     *
     * <p>{@code targetSequences} 는 {@code preserve} 에서만 쓰는 선택 선언이다 — 원본 키를 그대로 쓴 대상 컬럼이
     * 카탈로그로 연결되지 않은 시퀀스(예: 온라인 앱의 {@code @SequenceGenerator} 전용 시퀀스)로 채번되면 그 이름을,
     * 시퀀스로 채번되지 않으면 {@value #NO_SEQUENCE} 를 적는다. 적재가 끝나면 이 시퀀스를 원본 키 최댓값 뒤로
     * 맞춘다(DEC-OPS-306). 비어 있으면 직렬화하지 않아 선언 없는 mapping 의 digest 가 바뀌지 않는다.
     */
    public record IdentityStrategy(
            TargetIdentityPolicy policy,
            List<IdentityComponentSpec> sourceComponents,
            List<IdentityComponentSpec> targetComponents,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) Map<String, String> targetSequences
    ) {
        /** 시퀀스로 채번되지 않는 원본 키 컬럼의 선언 값. */
        public static final String NO_SEQUENCE = "none";

        private static final Pattern SEQUENCE_NAME =
                Pattern.compile("[A-Za-z_][A-Za-z0-9_$]*(\\.[A-Za-z_][A-Za-z0-9_$]*)?");

        /** targetSequences 도입 전 생성자 호환. */
        public IdentityStrategy(
                TargetIdentityPolicy policy,
                List<IdentityComponentSpec> sourceComponents,
                List<IdentityComponentSpec> targetComponents
        ) {
            this(policy, sourceComponents, targetComponents, Map.of());
        }

        public IdentityStrategy {
            Objects.requireNonNull(policy, "identity policy");
            sourceComponents = sourceComponents == null ? List.of() : List.copyOf(sourceComponents);
            targetComponents = targetComponents == null ? List.of() : List.copyOf(targetComponents);
            targetSequences = copyDeclarations(targetSequences);
            if (!targetSequences.isEmpty() && policy != TargetIdentityPolicy.PRESERVE) {
                throw new IllegalArgumentException("identity targetSequences는 preserve 정책에서만 선언할 수 있습니다");
            }
            for (Map.Entry<String, String> declared : targetSequences.entrySet()) {
                String column = declared.getKey();
                IdentityComponentSpec component = targetComponents.stream()
                        .filter(target -> target.column().equalsIgnoreCase(column))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException(
                                "identity targetSequences 키는 targetComponents 컬럼이어야 합니다: " + column));
                String sequence = declared.getValue();
                if (NO_SEQUENCE.equals(sequence)) {
                    continue;
                }
                if (!SEQUENCE_NAME.matcher(sequence).matches()) {
                    throw new IllegalArgumentException(
                            "identity targetSequences 값은 시퀀스 이름 또는 none 이어야 합니다: " + column);
                }
                if (component.type() != IdentityValueType.SIGNED_INTEGER
                        && component.type() != IdentityValueType.UNSIGNED_INTEGER
                        && component.type() != IdentityValueType.DECIMAL) {
                    throw new IllegalArgumentException(
                            "identity targetSequences 시퀀스는 정수 키 컬럼에만 선언할 수 있습니다: " + column);
                }
            }
        }

        private static Map<String, String> copyDeclarations(Map<String, String> declarations) {
            if (declarations == null) {
                return Map.of();
            }
            for (Map.Entry<String, String> declared : declarations.entrySet()) {
                if (declared.getKey() == null || declared.getValue() == null) {
                    throw new IllegalArgumentException("identity targetSequences 키와 값은 비어 있을 수 없습니다");
                }
            }
            return Map.copyOf(declarations);
        }

        /** 대상 컬럼(대소문자 무시)에 선언된 시퀀스 이름 또는 none. 선언이 없으면 null. */
        public String declaredSequence(String column) {
            for (Map.Entry<String, String> declared : targetSequences.entrySet()) {
                if (declared.getKey().equalsIgnoreCase(column)) {
                    return declared.getValue();
                }
            }
            return null;
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
