package nuri.migration.isolate;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * 표 하나에서 격리한 행의 집계(ADR-0029 L3b). 원장 행마다 격리한 행 수를 세고 상한을 넘으면 멈춘다. 실행마다 표 전체를
 * 다시 읽으므로 끝까지 적재한 실행의 집계가 곧 표 집계다.
 *
 * <ul>
 *   <li>한 행이 여러 원장 행의 승인 위반으로 실패하면 그 원장 행마다 한 번씩 센다.</li>
 *   <li>상한 확인은 행 단위로 한 번에 한다 — 한 원장 행이라도 넘으면 그 행은 아무 집계에도 들어가지 않는다.</li>
 *   <li>격리한 행의 순번(원천 정렬 순서의 1부터 위치)을 (원장 행, 컬럼, 위반)마다 모두 남긴다. 원장 행마다 상한이 1000
 *       이하라 크기가 묶인다. 같은 행을 두 번 세지 않도록 순번은 늘어나기만 한다.</li>
 *   <li>격리한 행이 시퀀스로 채번되는 대상 컬럼에 썼을 정수 키(preserve·remap·직접 매핑)의 최댓값을 컬럼마다 둔다 —
 *       시퀀스 재설정이 격리된 번호 뒤로 옮겨 온라인 앱이 그 번호를 다시 내주지 않게 하고, 데이터를 고친 뒤 같은 번호로
 *       다시 적재할 수 있게 한다.</li>
 * </ul>
 *
 * <p>값·키 원문은 담지 않는다(키 최댓값은 메모리에만 두고 결과·문구에 싣지 않는다).</p>
 */
public final class IsolationTally {

    private final String sourceTable;
    private final Map<String, Long> caps;
    private final Map<String, Long> counts = new LinkedHashMap<>();
    private final Map<GroupKey, List<Long>> groups = new LinkedHashMap<>();
    private long isolated;
    private long lastOrdinal;
    private final Map<String, BigInteger> maxPreservedKeys = new LinkedHashMap<>();

    /** {@code sourceTable} 은 문구에 쓰는 원천 표 이름, {@code caps} 는 원장 행마다의 상한이다. */
    public IsolationTally(String sourceTable, Map<String, Long> caps) {
        this.sourceTable = Objects.requireNonNull(sourceTable, "sourceTable");
        Objects.requireNonNull(caps, "caps");
        for (Map.Entry<String, Long> cap : caps.entrySet()) {
            if (cap.getKey() == null || cap.getValue() == null || cap.getValue() < 1) {
                throw new IllegalArgumentException("격리 상한은 원장 행마다 1 이상이어야 합니다");
            }
        }
        this.caps = Map.copyOf(caps);
    }

    /** 격리 한 무리 — 원장 행·대상 컬럼·위반과 그 행 수·순번(오름차순). */
    public record Isolation(String ledgerEntry, String column, String violation, long rows, List<Long> ordinals) {

        public Isolation {
            ordinals = List.copyOf(ordinals);
        }
    }

    /** 원장 행의 상한을 넘었다. 문구는 원장 행 ID·상한·원천 표·행 순번뿐이다. */
    public static final class CapExceeded extends IllegalStateException {
        private final String ledgerEntry;
        private final long maxRows;
        private final long ordinal;

        CapExceeded(String sourceTable, String ledgerEntry, long maxRows, long ordinal) {
            super("격리 상한 초과(원장 행 " + ledgerEntry + ", 상한 " + maxRows + "): " + sourceTable + " row=" + ordinal);
            this.ledgerEntry = ledgerEntry;
            this.maxRows = maxRows;
            this.ordinal = ordinal;
        }

        public String ledgerEntry() {
            return ledgerEntry;
        }

        public long maxRows() {
            return maxRows;
        }

        public long ordinal() {
            return ordinal;
        }
    }

    /**
     * 격리한 행 하나를 더한다. {@code ordinal} 은 원천 정렬 순서의 1부터 위치, {@code matches} 는 그 행의 격리
     * ({@link RowIsolationPolicy.Isolated#matches()}), {@code preservedKeys} 는 시퀀스로 채번되는 대상 컬럼마다 그 행이
     * 썼을 정수 키다(컬럼 이름 → 값, 알 수 없는 컬럼은 싣지 않는다). 상한을 넘으면 {@link CapExceeded} 를 던지고 아무것도
     * 더하지 않는다.
     */
    public void add(long ordinal, List<RowIsolationPolicy.Match> matches, Map<String, BigInteger> preservedKeys) {
        Objects.requireNonNull(matches, "matches");
        Objects.requireNonNull(preservedKeys, "preservedKeys");
        if (matches.isEmpty()) {
            throw new IllegalArgumentException("격리할 위반이 없는 행입니다");
        }
        if (ordinal < 1 || ordinal <= lastOrdinal) {
            throw new IllegalArgumentException("격리 행 순번은 1 이상이고 늘어나기만 합니다");
        }
        Set<String> entries = new LinkedHashSet<>();
        for (RowIsolationPolicy.Match match : matches) {
            Objects.requireNonNull(match, "match");
            if (!caps.containsKey(match.ledgerEntry())) {
                throw new IllegalArgumentException("선언하지 않은 원장 행의 격리입니다");
            }
            entries.add(match.ledgerEntry());
        }
        for (String entry : entries) {
            long cap = caps.get(entry);
            if (counts.getOrDefault(entry, 0L) + 1 > cap) {
                throw new CapExceeded(sourceTable, entry, cap, ordinal);
            }
        }
        for (String entry : entries) {
            counts.merge(entry, 1L, Long::sum);
        }
        for (RowIsolationPolicy.Match match : matches) {
            List<Long> ordinals = groups.computeIfAbsent(
                    new GroupKey(match.ledgerEntry(), match.column(), match.violation()), key -> new ArrayList<>());
            if (ordinals.isEmpty() || ordinals.getLast() != ordinal) {
                ordinals.add(ordinal);
            }
        }
        isolated++;
        lastOrdinal = ordinal;
        for (Map.Entry<String, BigInteger> key : preservedKeys.entrySet()) {
            if (key.getKey() != null && key.getValue() != null) {
                maxPreservedKeys.merge(key.getKey().toLowerCase(Locale.ROOT), key.getValue(), BigInteger::max);
            }
        }
    }

    /** 격리한 행 수. 한 행은 원장 행이 여럿이어도 한 번이다. */
    public long isolated() {
        return isolated;
    }

    /** 원장 행 하나의 격리 행 수. */
    public long count(String ledgerEntry) {
        return counts.getOrDefault(ledgerEntry, 0L);
    }

    /** (원장 행, 컬럼, 위반)마다의 격리. 처음 격리한 순서다. */
    public List<Isolation> isolations() {
        List<Isolation> result = new ArrayList<>(groups.size());
        for (Map.Entry<GroupKey, List<Long>> group : groups.entrySet()) {
            GroupKey key = group.getKey();
            result.add(new Isolation(key.ledgerEntry(), key.column(), key.violation(), group.getValue().size(),
                    group.getValue()));
        }
        return Collections.unmodifiableList(result);
    }

    /** 대상 컬럼(소문자)마다 격리한 행의 정수 키 최댓값. 키를 넘긴 격리 행이 없으면 비어 있다. */
    public Map<String, BigInteger> maxPreservedKeys() {
        return Collections.unmodifiableMap(maxPreservedKeys);
    }

    /** 대상 컬럼 하나의 격리 행 정수 키 최댓값. */
    public Optional<BigInteger> maxPreservedKey(String column) {
        return Optional.ofNullable(column == null ? null : maxPreservedKeys.get(column.toLowerCase(Locale.ROOT)));
    }

    /**
     * 보존 키 값을 정수로 읽는다. 정수가 아닌 값 종류(문자·날짜 등)는 시퀀스와 무관해 null 이다. 소수부가 있는 수는 정수
     * 키가 아니므로 거부한다 — 시퀀스 재설정 목표를 정할 수 없어서다.
     */
    public static BigInteger integerKey(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof BigInteger integer) {
            return integer;
        }
        if (value instanceof Long || value instanceof Integer || value instanceof Short || value instanceof Byte) {
            return BigInteger.valueOf(((Number) value).longValue());
        }
        if (value instanceof BigDecimal decimal) {
            try {
                return decimal.toBigIntegerExact();
            } catch (ArithmeticException fractional) {
                throw new IllegalArgumentException("격리 행의 보존 키가 정수가 아닙니다");
            }
        }
        return null;
    }

    private record GroupKey(String ledgerEntry, String column, String violation) {}
}
