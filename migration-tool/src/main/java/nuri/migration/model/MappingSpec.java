package nuri.migration.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;

import java.util.List;
import java.util.Map;
import java.util.Objects;

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
