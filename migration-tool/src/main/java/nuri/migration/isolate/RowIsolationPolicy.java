package nuri.migration.isolate;

import nuri.migration.identity.TargetIdentityPolicy;
import nuri.migration.model.MappingSpec.ColumnMapping;
import nuri.migration.model.MappingSpec.CompositeForeignKey;
import nuri.migration.model.MappingSpec.Isolate;
import nuri.migration.model.MappingSpec.TableMapping;
import nuri.migration.validate.ledger.LoadCapabilities;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * 승인 행 격리의 판정(ADR-0029 L3b). 행 하나의 변환 실패 목록을 mapping 의 {@code isolate} 선언과 대조해 격리할지 멈출지를
 * 정한다. 값은 보지 않는다 — 실패의 컬럼·단계·사유 코드만 본다.
 *
 * <p>판정 순서(설계서 예외 행 격리 절):</p>
 * <ol>
 *   <li>실패 하나라도 {@code isolate} 를 선언하지 않은 컬럼에서 났거나, 격리 어휘 대응표에 없는 사유거나, 대응한 코드가
 *       그 컬럼의 {@code violations} 밖이면 멈춘다 — 첫 실패가 승인돼도 뒤 실패를 모두 본다.</li>
 *   <li>이미 커밋된(durable checkpoint) 행이 새로 실패하면 멈춘다({@code ISOLATION_ON_DURABLE_ROW}).</li>
 *   <li>그 밖이면 실패마다 (원장 행, 컬럼, 코드) 로 격리한다. 상한은 {@link IsolationTally} 가 센다.</li>
 * </ol>
 *
 * <p>격리 어휘 대응표(설계서 표준 도메인 변환기와 nullify 절): {@code DOMAIN_VIOLATION(<코드>)} → 그 코드
 * ({@code UNSUPPORTED_VALUE_TYPE} 제외), {@code TYPE_CONVERSION_FAILED} → {@code FORMAT}, 내장 date·timestamp 의
 * {@code TRANSFORM_FAILED(FORMAT)} → {@code FORMAT}, {@code CODEMAP_UNMAPPED} → {@code CODEMAP_UNMAPPED}. 나머지는 격리할
 * 수 없다 — 쓰기 단계 실패는 이 판정에 오지 않는다(DEC-OPS-310).</p>
 */
public final class RowIsolationPolicy {

    private static final String DOMAIN_VIOLATION = "DOMAIN_VIOLATION";
    private static final String TRANSFORM_FAILED = "TRANSFORM_FAILED";
    private static final String TYPE_CONVERSION_FAILED = "TYPE_CONVERSION_FAILED";
    private static final String CODEMAP_UNMAPPED = "CODEMAP_UNMAPPED";
    private static final String FORMAT = "FORMAT";

    private final Map<String, Declaration> declarations;

    private RowIsolationPolicy(Map<String, Declaration> declarations) {
        this.declarations = declarations;
    }

    /** 컬럼 하나의 격리 선언. {@code column} 은 mapping 의 대상 컬럼 이름이다. */
    public record Declaration(String column, String ledgerEntry, long maxRows, List<String> violations) {

        public Declaration {
            Objects.requireNonNull(column, "column");
            Objects.requireNonNull(ledgerEntry, "ledgerEntry");
            violations = List.copyOf(violations);
        }
    }

    /**
     * 행 하나의 변환 실패. {@code column} 은 실패한 대상 컬럼(식별자·FK 단계면 {@code <identity>} 같은 표지),
     * {@code reason} 은 실행기의 실패 단계 이름, {@code detail} 은 그 사유 코드(없으면 null)다. 값은 담지 않는다.
     */
    public record Failure(String column, String reason, String detail) {}

    /** 격리 한 건 — 원장 행·대상 컬럼·격리 코드. */
    public record Match(String ledgerEntry, String column, String violation) {}

    /** 멈춘 이유. */
    public enum StopCause {
        /** {@code isolate} 를 선언하지 않은 컬럼(식별자·FK 단계 포함)의 실패다. */
        NOT_DECLARED,
        /** 격리 어휘 대응표에 없는 실패다. */
        NOT_ISOLATABLE,
        /** 대응한 코드가 그 컬럼의 승인 위반 밖이다. */
        NOT_APPROVED,
        /** 이미 커밋된 행이 새로 실패했다. */
        ISOLATION_ON_DURABLE_ROW
    }

    /** 판정 결과. */
    public sealed interface Decision permits Isolated, Stopped {}

    /** 모든 실패가 승인됐다. {@code matches} 는 실패 순서다. */
    public record Isolated(List<Match> matches) implements Decision {

        public Isolated {
            matches = List.copyOf(matches);
        }
    }

    /** 멈춘다. {@code failure} 는 멈춘 원인이 된 실패다(durable 이면 첫 실패). */
    public record Stopped(StopCause cause, Failure failure) implements Decision {}

    /** 표 매핑의 {@code isolate} 선언으로 만든다. 선언이 없으면 {@link #active()} 가 거짓이다. */
    public static RowIsolationPolicy of(TableMapping table) {
        Objects.requireNonNull(table, "table");
        Map<String, Declaration> declarations = new LinkedHashMap<>();
        for (ColumnMapping column : table.columns()) {
            Isolate isolate = column == null ? null : column.isolate();
            if (isolate == null) {
                continue;
            }
            if (column.target() == null || isolate.ledgerEntry() == null || isolate.maxRows() == null
                    || isolate.maxRows() < 1 || isolate.maxRows() > LoadCapabilities.MAX_EXCEPTION_ROWS
                    || isolate.violations().isEmpty()) {
                throw new IllegalArgumentException(table.source() + ": isolate 선언이 완전하지 않습니다");
            }
            Declaration previous = declarations.put(normalize(column.target()), new Declaration(column.target(),
                    isolate.ledgerEntry(), isolate.maxRows(), isolate.violations()));
            if (previous != null) {
                throw new IllegalArgumentException(table.source() + ": 같은 대상 컬럼에 isolate 가 두 번 있습니다");
            }
        }
        return new RowIsolationPolicy(Collections.unmodifiableMap(declarations));
    }

    /** 이 표에 격리 선언이 있는가 — 있으면 실행기는 행의 모든 실패를 모아 판정한다(수집 모드). */
    public boolean active() {
        return !declarations.isEmpty();
    }

    /** 원장 행마다의 격리 상한. */
    public Map<String, Long> caps() {
        Map<String, Long> caps = new LinkedHashMap<>();
        for (Declaration declaration : declarations.values()) {
            Long previous = caps.putIfAbsent(declaration.ledgerEntry(), declaration.maxRows());
            if (previous != null && previous != declaration.maxRows()) {
                throw new IllegalArgumentException("원장 행 " + declaration.ledgerEntry() + " 의 isolate 상한이 컬럼마다"
                        + " 다릅니다");
            }
        }
        return caps;
    }

    /**
     * 행 하나의 실패 목록을 판정한다. {@code durable} 은 이 행이 이미 커밋된 checkpoint 를 가졌는지다. 실패가 없으면
     * 판정할 것이 없으므로 거부한다.
     */
    public Decision decide(List<Failure> failures, boolean durable) {
        Objects.requireNonNull(failures, "failures");
        if (failures.isEmpty()) {
            throw new IllegalArgumentException("판정할 실패가 없습니다");
        }
        List<Match> matches = new ArrayList<>(failures.size());
        for (Failure failure : failures) {
            Objects.requireNonNull(failure, "failure");
            Declaration declaration = failure.column() == null ? null : declarations.get(normalize(failure.column()));
            if (declaration == null) {
                return new Stopped(StopCause.NOT_DECLARED, failure);
            }
            String code = isolationCode(failure.reason(), failure.detail());
            if (code == null) {
                return new Stopped(StopCause.NOT_ISOLATABLE, failure);
            }
            if (!declaration.violations().contains(code)) {
                return new Stopped(StopCause.NOT_APPROVED, failure);
            }
            matches.add(new Match(declaration.ledgerEntry(), declaration.column(), code));
        }
        if (durable) {
            return new Stopped(StopCause.ISOLATION_ON_DURABLE_ROW, failures.getFirst());
        }
        return new Isolated(matches);
    }

    /**
     * 격리 어휘 대응표. 실행기의 실패 단계 {@code reason} 과 사유 {@code detail} 을 원장 위반 코드로 옮긴다. 격리할 수
     * 없으면 null 이다. 사유가 격리할 수 있는 코드({@link LoadCapabilities#ISOLATABLE})가 아니면 대응하지 않는다.
     */
    public static String isolationCode(String reason, String detail) {
        if (reason == null) {
            return null;
        }
        String code = switch (reason) {
            case DOMAIN_VIOLATION -> detail;
            case TYPE_CONVERSION_FAILED -> FORMAT;
            case TRANSFORM_FAILED -> FORMAT.equals(detail) ? FORMAT : null;
            case CODEMAP_UNMAPPED -> CODEMAP_UNMAPPED;
            default -> null;
        };
        return code != null && LoadCapabilities.ISOLATABLE.contains(code) ? code : null;
    }

    /**
     * 이 표 매핑의 행을 격리할 수 없는 이유. 없으면 null. {@code tables} 는 mapping 의 모든 표 매핑이다.
     *
     * <ul>
     *   <li>target_generated 매핑 — 대상이 만든 키를 행마다 되읽으므로 격리 행의 자리를 정할 수 없다.</li>
     *   <li>자기참조 매핑 — 적재 전에 모든 행의 키를 먼저 채번해 커밋한다(preMint).</li>
     *   <li>다른 매핑의 fkRef·foreignKeys 가 부모로 가리키는 매핑 — 격리한 부모를 참조하는 자식이 고아가 된다.</li>
     * </ul>
     */
    public static String tableBlocker(List<TableMapping> tables, TableMapping table) {
        Objects.requireNonNull(tables, "tables");
        Objects.requireNonNull(table, "table");
        if (table.identity() != null && table.identity().policy() == TargetIdentityPolicy.TARGET_GENERATED) {
            return "target_generated 매핑";
        }
        if (table.source() == null) {
            return null;
        }
        for (ColumnMapping column : table.columns()) {
            if (column != null && column.fkRef() != null && column.fkRef().equalsIgnoreCase(table.source())) {
                return "자기참조 매핑";
            }
        }
        for (TableMapping other : tables) {
            if (other == null || other == table) {
                continue;
            }
            for (ColumnMapping column : other.columns()) {
                if (column != null && column.fkRef() != null && column.fkRef().equalsIgnoreCase(table.source())) {
                    return "다른 매핑이 부모로 참조하는 매핑";
                }
            }
            for (CompositeForeignKey foreignKey : other.foreignKeys()) {
                if (foreignKey.parentSource().equalsIgnoreCase(table.source())) {
                    return "다른 매핑이 부모로 참조하는 매핑";
                }
            }
        }
        return null;
    }

    /**
     * 이 컬럼을 격리할 수 없는 이유. 없으면 null — 암호화 컬럼(암호문은 평문을 다시 보지 않는다), fkRef 컬럼(부모 키를
     * 번역한다), 소스 값을 변환하지 않는 컬럼(const·source 없음).
     */
    public static String columnBlocker(ColumnMapping column) {
        Objects.requireNonNull(column, "column");
        if (column.encrypt() != null) {
            return "암호화 컬럼";
        }
        if (column.fkRef() != null && !column.fkRef().isBlank()) {
            return "fkRef 컬럼";
        }
        if (column.constant() != null || column.source() == null || column.source().isBlank()) {
            return "값을 변환하지 않는 컬럼(const·source 없음)";
        }
        return null;
    }

    private static String normalize(String column) {
        return column.toLowerCase(Locale.ROOT);
    }
}
