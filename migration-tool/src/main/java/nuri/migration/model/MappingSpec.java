package nuri.migration.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import nuri.migration.domain.DomainViolation;
import nuri.migration.identity.IdentityValueType;
import nuri.migration.identity.TargetIdentityPolicy;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
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
        Map<String, CodeMap> codemaps,
        RunContext run,
        @JsonInclude(JsonInclude.Include.NON_NULL) LedgerBinding ledger,
        @JsonInclude(JsonInclude.Include.NON_EMPTY) List<ArchiveDump> archives
) {

    /** 기존 dry-run/단위 테스트 호환 생성자. COMMIT은 명시적 run 계약을 별도로 강제한다. */
    public MappingSpec(DbConfig source, DbConfig target, List<TableMapping> tables,
                       Map<String, CodeMap> codemaps) {
        this(source, target, tables, codemaps, null, null, List.of());
    }

    /** 용어 매핑 원장 도입 전 생성자 호환. 원장이 없으면 mapping 의미와 digest 가 그대로다. */
    public MappingSpec(DbConfig source, DbConfig target, List<TableMapping> tables,
                       Map<String, CodeMap> codemaps, RunContext run) {
        this(source, target, tables, codemaps, run, null, List.of());
    }

    /** 외부 보관 덤프 도입 전 생성자 호환. 보관 선언이 없으면 mapping 의미와 digest 가 그대로다. */
    public MappingSpec(DbConfig source, DbConfig target, List<TableMapping> tables,
                       Map<String, CodeMap> codemaps, RunContext run, LedgerBinding ledger) {
        this(source, target, tables, codemaps, run, ledger, List.of());
    }

    /**
     * [ADR-0029 결정 3, DEC-OPS-312] 용어 매핑 원장 결속. {@code path} 는 mapping 파일이 있는 디렉터리 기준이고
     * {@code sha256} 은 원장 파일 바이트의 SHA-256(소문자 hex)이다. 선언하면 mapping digest 에 들어가 plan·load 가
     * 같은 원장을 요구하고, mapping 이 옮기는 모든 컬럼이 원장의 확정 행을 가리켜야 한다.
     */
    public record LedgerBinding(String path, String sha256) {}

    public MappingSpec {
        tables = tables == null ? List.of() : tables;
        codemaps = codemaps == null ? Map.of() : codemaps;
        // null 항목은 그대로 두고 검증이 위치와 함께 거부한다(tables 와 같다).
        archives = archives == null ? List.of() : archives;
    }

    /**
     * 보관 선언의 {@code source} 를 읽는 표 매핑 — 같은 source 표기(앞뒤 공백·대소문자 무시)의 표 매핑이다. 없으면 null 이고,
     * 그 보관은 덤프만 하는 표다(ADR-0029 L3e). 같은 표를 다른 표기로 적었는지는 원장 coverage 가 inventory 로 따로 본다.
     *
     * <p>[ADR-0029 L3c] 한 소스를 여러 매핑이 나눠 읽으면 보관 컬럼은 keymap 소유 매핑(idStrategy·typed identity)의 읽기에,
     * 소유 매핑이 없으면 id 를 생략한 매핑의 읽기에 붙인다. 둘 다 없으면 선언 순서의 첫 매핑을 돌려주고, 그런 보관 선언은
     * mapping 검증이 거부한다({@link #archiveReaderAmbiguous}).</p>
     */
    public TableMapping mappedTableOf(String archiveSource) {
        List<TableMapping> readers = archiveReaders(archiveSource);
        if (readers.isEmpty()) {
            return null;
        }
        if (readers.size() == 1) {
            return readers.getFirst();
        }
        for (TableMapping table : readers) {
            if (table.ownsKeyMap()) {
                return table;
            }
        }
        for (TableMapping table : readers) {
            if (table.id() == null) {
                return table;
            }
        }
        return readers.getFirst();
    }

    /**
     * 보관 선언의 {@code source} 를 여러 매핑이 나눠 읽는데 keymap 소유 매핑도 id 를 생략한 매핑도 없어 보관 컬럼을 붙일 읽기를
     * 정할 수 없는가(ADR-0029 L3c·L3e).
     */
    public boolean archiveReaderAmbiguous(String archiveSource) {
        List<TableMapping> readers = archiveReaders(archiveSource);
        return readers.size() > 1
                && readers.stream().noneMatch(table -> table.ownsKeyMap() || table.id() == null);
    }

    private List<TableMapping> archiveReaders(String archiveSource) {
        if (archiveSource == null || archiveSource.isBlank()) {
            return List.of();
        }
        String wanted = archiveSource.trim().toLowerCase(Locale.ROOT);
        List<TableMapping> readers = new ArrayList<>(1);
        for (TableMapping table : tables) {
            if (table != null && table.source() != null && table.source().trim().toLowerCase(Locale.ROOT).equals(wanted)) {
                readers.add(table);
            }
        }
        return readers;
    }

    /**
     * 외부 보관 덤프 선언 한 건(ADR-0029 L3e). COMMIT load 가 적재와 같은 원천 읽기 세션 안에서 {@code source} 표의
     * {@code columns} 원시 값을 정렬 키와 함께 덤프 파일에 쓰고, 기관이 {@code retainUntil}(yyyy-MM-dd)까지 보관한다.
     * {@code ledgerEntries} 는 {@code columns} 와 같은 순서의 원장 외부 보관(ARCHIVE) 행 ID 다. mapping-generate 가 원장
     * ARCHIVE 행을 (소스 표, 보존 기한) 으로 묶어 만든다 — 보존 기한이 다른 행은 같은 덤프에 섞지 않는다.
     *
     * <p>{@code source} 를 표 매핑이 읽으면(매핑된 표) 그 매핑의 where·정렬 키를 그대로 쓰고 읽는 행을 모두 덤프한다 —
     * 보관 선언에 {@code where}·{@code orderByKeys} 를 따로 두면 오류다. 덤프만 하는 표는 skeleton 의 {@code orderByKeys}
     * (필수)·{@code where}(선택)를 받는다. 빈 칸은 직렬화하지 않는다.</p>
     */
    public record ArchiveDump(
            String id,
            String source,
            @JsonInclude(JsonInclude.Include.NON_NULL) String where,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<String> orderByKeys,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<String> columns,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<String> ledgerEntries,
            @JsonInclude(JsonInclude.Include.NON_NULL) String retainUntil) {

        public ArchiveDump {
            orderByKeys = orderByKeys == null ? List.of() : List.copyOf(orderByKeys);
            columns = columns == null ? List.of() : List.copyOf(columns);
            ledgerEntries = ledgerEntries == null ? List.of() : List.copyOf(ledgerEntries);
        }

        /**
         * mapping.yml 의 보관 선언 한 건을 읽는다. 이름·기한은 문자로만, 목록은 문자의 목록으로만 받는다 —
         * {@code columns: [1]}·{@code retainUntil: 20311231} 처럼 검토자가 본 글자와 승인 digest 가 뜻하는 값이 갈리는
         * 표기를 거부한다. 없는 필드는 비워 두고 검증이 거부한다. 오류는 고정 문구다.
         */
        @JsonCreator
        public static ArchiveDump fromMapping(@JsonProperty("id") Object id,
                                              @JsonProperty("source") Object source,
                                              @JsonProperty("where") Object where,
                                              @JsonProperty("orderByKeys") Object orderByKeys,
                                              @JsonProperty("columns") Object columns,
                                              @JsonProperty("ledgerEntries") Object ledgerEntries,
                                              @JsonProperty("retainUntil") Object retainUntil) {
            return new ArchiveDump(text(id), text(source), text(where), names(orderByKeys), names(columns),
                    names(ledgerEntries), text(retainUntil));
        }

        private static String text(Object raw) {
            if (raw == null || raw instanceof String) {
                return (String) raw;
            }
            throw new IllegalArgumentException("archives 의 id·source·where·retainUntil 은 따옴표로 감쌀 수 있는 문자여야"
                    + " 합니다");
        }

        private static List<String> names(Object raw) {
            if (raw == null) {
                return List.of();
            }
            if (raw instanceof List<?> list && list.stream().allMatch(String.class::isInstance)) {
                return list.stream().map(String.class::cast).toList();
            }
            throw new IllegalArgumentException("archives 의 orderByKeys·columns·ledgerEntries 는 이름 문자의 목록이어야"
                    + " 합니다");
        }
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

    /**
     * 소스 테이블 → 타깃 테이블 매핑.
     *
     * <p>{@code id}(ADR-0029 L3c)는 한 소스 표를 여러 대상으로 나눌 때(1:N 분할) 매핑을 가리는 식별자다. 형식은
     * {@code [a-z][a-z0-9_]{0,62}} 이고 mapping 전체에서 유일하다. 같은 소스에서 id 를 생략할 수 있는 매핑은 하나뿐이다.
     * 같은 소스에서 keymap 을 만드는 매핑(idStrategy·identity)도 하나뿐이고, fkRef·foreignKeys 의 부모는 그 매핑이다
     * ({@code nuri.migration.mapping.MappingIndex}). 비어 있으면 직렬화하지 않아 분할하지 않은 mapping 의 digest 가
     * 바뀌지 않는다.
     *
     * <p>{@code lookups}(ADR-0029 L3d)는 다른 소스 표를 단일 키로 조회해 그 컬럼을 {@code alias.COLUMN} 으로 읽는
     * 조회 조인이다({@link Lookup}). 쓰는 매핑에는 id 와 순서 키가 필요하다. 비어 있으면 직렬화하지 않아 조회하지 않는
     * mapping 의 digest 가 바뀌지 않는다.
     */
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
            List<CompositeForeignKey> foreignKeys,
            @JsonInclude(JsonInclude.Include.NON_NULL) String id,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<Lookup> lookups
    ) {
        /** 기본 매핑(id 없음)의 실효 id — checkpoint {@code mapping_id} 의 값이다. */
        public static final String DEFAULT_ID = "";

        /** 조회 조인 도입 전 canonical 생성자 호환 — 조회하지 않는다. */
        public TableMapping(String source, String target, String where, String orderBy,
                            List<String> orderByKeys, String targetKey, List<ColumnMapping> columns,
                            IdStrategy idStrategy, IdentityStrategy identity,
                            List<CompositeForeignKey> foreignKeys, String id) {
            this(source, target, where, orderBy, orderByKeys, targetKey, columns, idStrategy, identity,
                    foreignKeys, id, List.of());
        }

        /** 매핑 id 도입 전 canonical 생성자 호환 — 기본 매핑이다. */
        public TableMapping(String source, String target, String where, String orderBy,
                            List<String> orderByKeys, String targetKey, List<ColumnMapping> columns,
                            IdStrategy idStrategy, IdentityStrategy identity,
                            List<CompositeForeignKey> foreignKeys) {
            this(source, target, where, orderBy, orderByKeys, targetKey, columns, idStrategy, identity,
                    foreignKeys, null);
        }

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
            // null 항목도 그대로 둔다 — 검증기가 위치를 밝혀 거부한다.
            lookups = lookups == null ? List.of() : Collections.unmodifiableList(new ArrayList<>(lookups));
        }

        /** 실효 매핑 id. 생략하면 {@link #DEFAULT_ID} 다. 형식은 검증기와 실행기가 확인한다. */
        public String effectiveId() {
            return id == null ? DEFAULT_ID : id;
        }

        /** 이 별칭의 조회 조인. 없으면 null 이다. */
        public Lookup lookup(String alias) {
            if (alias == null) {
                return null;
            }
            for (Lookup lookup : lookups) {
                if (lookup != null && alias.equals(lookup.alias())) {
                    return lookup;
                }
            }
            return null;
        }

        /** 이 매핑이 소스 표의 keymap 을 만드는가(idStrategy·typed identity) — keymap 소유 매핑이다. */
        public boolean ownsKeyMap() {
            return idStrategy != null || identity != null;
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
     *
     * <p>{@code encrypt}(보호 방식 id, 예: {@code aria-egov-v1})는 온라인 앱이 암호화해 저장하는 대상 컬럼에 쓴다.
     * 이관 도구가 온라인 앱과 같은 암호문을 만들어 쓰며, 키는 실행 때 환경 변수로만 받는다(DEC-OPS-308). 비어 있으면
     * 직렬화하지 않아 선언 없는 mapping 의 digest 가 바뀌지 않는다.
     *
     * <p>{@code nullify}(ADR-0029 L3a-1)는 표준 도메인 변환기나 비문자 {@code type} 이 거부한 값 가운데 선언한 위반
     * ({@code BLANK}·{@code PLACEHOLDER_DATE})만 NULL 로 바꾸는 규칙이다. 위반마다 {@code maxRows} 상한을 두고, 표 전체에서
     * 그보다 많으면 chunk 를 롤백하고 멈춘다. 비어 있으면 직렬화하지 않아 선언 없는 mapping 의 digest 가 바뀌지 않는다.
     *
     * <p>{@code isolate}(ADR-0029 L3b)는 원장이 승인한 위반으로 이 컬럼이 거부한 행을 적재하지 않고 격리하는 선언이다
     * ({@link Isolate}). 없으면 직렬화하지 않아 선언 없는 mapping 의 digest 가 바뀌지 않는다.
     */
    public record ColumnMapping(
            String source,
            String target,
            String transform,
            String type,
            String codemap,
            String fkRef,
            @JsonProperty("const") String constant,
            @JsonInclude(JsonInclude.Include.NON_NULL) String encrypt,
            @JsonInclude(JsonInclude.Include.NON_EMPTY) List<Nullify> nullify,
            @JsonInclude(JsonInclude.Include.NON_NULL) Isolate isolate
    ) {
        /** encrypt 도입 전 생성자 호환. */
        public ColumnMapping(String source, String target, String transform, String type,
                             String codemap, String fkRef, String constant) {
            this(source, target, transform, type, codemap, fkRef, constant, null, List.of(), null);
        }

        /** nullify 도입 전 생성자 호환. */
        public ColumnMapping(String source, String target, String transform, String type,
                             String codemap, String fkRef, String constant, String encrypt) {
            this(source, target, transform, type, codemap, fkRef, constant, encrypt, List.of(), null);
        }

        /** isolate 도입 전 생성자 호환. */
        public ColumnMapping(String source, String target, String transform, String type,
                             String codemap, String fkRef, String constant, String encrypt, List<Nullify> nullify) {
            this(source, target, transform, type, codemap, fkRef, constant, encrypt, nullify, null);
        }

        public ColumnMapping {
            nullify = nullify == null ? List.of() : List.copyOf(nullify);
        }
    }

    /**
     * 승인 행 격리 한 건(ADR-0029 L3b). 이 컬럼이 원장 행 {@code ledgerEntry} 가 승인한 위반 {@code violations} 로만 거부한
     * 행은 적재하지 않고 순번과 함께 센다. 원장 행마다 표 전체에서 {@code maxRows} 행까지만 격리하고, 넘으면 멈춘다.
     * mapping-generate 가 원장의 승인 예외 가운데 nullify 로 NULL 이 되지 않는 위반만 옮긴다 — plan·load 의 원장 대조가
     * 같은 판정으로 양방향을 맞춘다.
     */
    public record Isolate(String ledgerEntry, Long maxRows, List<String> violations) {

        public Isolate {
            violations = violations == null ? List.of() : List.copyOf(violations);
        }

        /**
         * mapping.yml 의 isolate 한 건을 읽는다. 원장 행 ID 는 문자로만, 상한은 정수 스칼라로만, 위반은 이름 문자의
         * 목록으로만 받는다 — nullify 와 같이 {@code maxRows: 2.7}·{@code violations: [1]} 처럼 검토자가 본 글자와 승인
         * digest 가 뜻하는 값이 갈리는 표기를 거부한다. 없는 필드는 비워 두고 검증이 거부한다. 오류는 고정 문구다.
         */
        @JsonCreator
        public static Isolate fromMapping(@JsonProperty("ledgerEntry") Object ledgerEntry,
                                          @JsonProperty("maxRows") Object maxRows,
                                          @JsonProperty("violations") Object violations) {
            if (ledgerEntry != null && !(ledgerEntry instanceof String)) {
                throw new IllegalArgumentException("isolate 의 ledgerEntry 는 원장 행 ID 문자여야 합니다");
            }
            return new Isolate((String) ledgerEntry, maxRowsOf(maxRows), violationsOf(violations));
        }

        private static Long maxRowsOf(Object raw) {
            if (raw == null) {
                return null;
            }
            if (raw instanceof Integer || raw instanceof Long || raw instanceof Short || raw instanceof Byte) {
                return ((Number) raw).longValue();
            }
            throw new IllegalArgumentException("isolate 의 maxRows 는 정수여야 합니다");
        }

        private static List<String> violationsOf(Object raw) {
            if (raw == null) {
                return List.of();
            }
            if (raw instanceof List<?> list && list.stream().allMatch(String.class::isInstance)) {
                return list.stream().map(String.class::cast).toList();
            }
            throw new IllegalArgumentException("isolate 의 violations 는 위반 이름(INVALID_DATE 등) 문자의 목록이어야 합니다");
        }
    }

    /**
     * 규칙 정제 한 건(ADR-0029 L3a-1). {@code violation} 으로 거부된 값을 NULL 로 바꾸되 표 전체에서 {@code maxRows} 행까지만
     * 바꾼다. 실행기는 {@code BLANK}·{@code PLACEHOLDER_DATE} 와 1 이상의 상한만 받는다.
     */
    public record Nullify(DomainViolation violation, Long maxRows) {

        /**
         * mapping.yml 의 nullify 한 건을 읽는다. 위반은 이름 글자로만, 상한은 정수 스칼라로만 받는다 — 기본 역직렬화는
         * {@code violation: 1} 을 enum 순서로, {@code maxRows: 2.7} 을 2 로 읽어 검토자가 본 글자와 승인 digest 가 뜻하는
         * 값이 달라진다. 없는 필드는 null 로 두고 검증·실행 시작이 거부한다. 오류는 고정 문구다.
         */
        @JsonCreator
        public static Nullify fromMapping(@JsonProperty("violation") Object violation,
                                          @JsonProperty("maxRows") Object maxRows) {
            return new Nullify(violationOf(violation), maxRowsOf(maxRows));
        }

        private static DomainViolation violationOf(Object raw) {
            if (raw == null) {
                return null;
            }
            if (raw instanceof String name) {
                for (DomainViolation violation : DomainViolation.values()) {
                    if (violation.name().equals(name)) {
                        return violation;
                    }
                }
            }
            throw new IllegalArgumentException("nullify 의 violation 은 위반 이름(BLANK·PLACEHOLDER_DATE 등)이어야 합니다");
        }

        private static Long maxRowsOf(Object raw) {
            if (raw == null) {
                return null;
            }
            if (raw instanceof Integer || raw instanceof Long || raw instanceof Short || raw instanceof Byte) {
                return ((Number) raw).longValue();
            }
            throw new IllegalArgumentException("nullify 의 maxRows 는 정수여야 합니다");
        }
    }

    /**
     * 조회 조인 한 건(ADR-0029 L3d). 매핑의 행마다 {@code key.from}(이 매핑 소스의 컬럼) 값으로 {@code source} 표에서
     * {@code key.to} 가 같은 행을 같은 읽기 세션에서 찾고, 그 행의 컬럼을 {@code alias.COLUMN} 으로 읽게 한다. 단일 키만
     * 받고 짝은 많아야 하나다 — 둘 이상이면 멈춘다({@code LOOKUP_FANOUT}). {@link LookupCardinality#EXACTLY_ONE} 은 짝이
     * 없거나 키가 비면 멈추고, {@link LookupCardinality#AT_MOST_ONE} 은 조회한 컬럼에 NULL 을 넣되 표 전체에서
     * {@code maxMissing} 행까지만 받는다. {@code where} 는 조회 표에만 거는 읽기 조건이다.
     */
    public record Lookup(String alias, String source, String where, LookupKey key,
                         LookupCardinality cardinality, Long maxMissing) {

        /**
         * mapping.yml 의 lookup 한 건을 읽는다. {@code maxMissing} 은 정수 스칼라로만 받는다 — 기본 역직렬화는
         * {@code maxMissing: 2.7} 을 2 로 읽어 검토자가 본 글자와 승인 digest 가 뜻하는 값이 달라진다. 오류는 고정 문구다.
         */
        @JsonCreator
        public static Lookup fromMapping(@JsonProperty("alias") String alias,
                                         @JsonProperty("source") String source,
                                         @JsonProperty("where") String where,
                                         @JsonProperty("key") LookupKey key,
                                         @JsonProperty("cardinality") LookupCardinality cardinality,
                                         @JsonProperty("maxMissing") Object maxMissing) {
            if (maxMissing != null && !(maxMissing instanceof Integer || maxMissing instanceof Long
                    || maxMissing instanceof Short || maxMissing instanceof Byte)) {
                throw new IllegalArgumentException("lookup 의 maxMissing 은 정수여야 합니다");
            }
            return new Lookup(alias, source, where, key, cardinality,
                    maxMissing == null ? null : ((Number) maxMissing).longValue());
        }
    }

    /** 조회 키 — {@code from} 은 이 매핑 소스의 컬럼, {@code to} 는 조회 표의 컬럼이다. 단일 컬럼만 받는다. */
    public record LookupKey(String from, String to) {}

    /** 조회 짝의 수. 둘 이상은 어느 쪽이든 멈춘다. */
    public enum LookupCardinality {
        /** 짝이 정확히 하나여야 한다. 없거나 키가 비면 멈춘다({@code LOOKUP_MISSING}). */
        EXACTLY_ONE,
        /** 짝이 없으면 조회한 컬럼을 NULL 로 두고 세며, {@code maxMissing} 을 넘으면 멈춘다. */
        AT_MOST_ONE;

        /** 적은 그대로의 이름({@code exactly_one}·{@code at_most_one})만 받는다. */
        @JsonCreator
        public static LookupCardinality parse(String value) {
            for (LookupCardinality cardinality : values()) {
                if (cardinality.externalName().equals(value)) {
                    return cardinality;
                }
            }
            throw new IllegalArgumentException("lookup 의 cardinality 는 exactly_one·at_most_one 중 하나여야 합니다");
        }

        @JsonValue
        public String externalName() {
            return name().toLowerCase(Locale.ROOT);
        }
    }

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

    /**
     * 기존 문자열 idStrategy와 병용하지 않는 typed/composite identity DSL.
     *
     * <p>{@code targetSequences} 는 mapping 이 대상 키 값을 넣는 {@code preserve}·{@code remap} 에서만 쓰는 선택
     * 선언이다 — 그 대상 컬럼이 카탈로그로 연결되지 않은 시퀀스(예: 온라인 앱의 {@code @SequenceGenerator} 전용
     * 시퀀스)로 채번되면 그 이름을, 시퀀스로 채번되지 않으면 {@value #NO_SEQUENCE} 를 적는다. 적재가 끝나면 이
     * 시퀀스를 대상 키 최댓값 뒤로 맞춘다(DEC-OPS-306). 비어 있으면 직렬화하지 않아 선언 없는 mapping 의 digest 가
     * 바뀌지 않는다.
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
            if (!targetSequences.isEmpty() && policy == TargetIdentityPolicy.TARGET_GENERATED) {
                throw new IllegalArgumentException("identity targetSequences는 preserve·remap 정책에서만 선언할 수 있습니다");
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
