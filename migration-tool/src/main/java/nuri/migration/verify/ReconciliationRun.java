package nuri.migration.verify;

import nuri.migration.transform.CodeTranslator.Translation;
import nuri.migration.verify.ColumnCheck.Aggregate;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.SourceAggregateQuery.AggregateColumn;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * [ADR-0029 L4 D2·D7] 한 load 의 대사 수집 홀더. 실행기가 원천 집계·격리 행 기여·codemap 결과·표본을 채우고 verifier 가 읽는다.
 *
 * <p>원천 값(집계·격리 키·표본 원값·코드값)을 담으므로 직렬화하지 않고, 증거·문구·{@code toString} 에 내지 않는다. 비활성
 * ({@link #none()})이면 모든 수집이 아무 일도 하지 않는다. 실행기는 표를 하나씩 처리하므로 동기화하지 않는다.</p>
 */
public final class ReconciliationRun {

    /** 매핑마다 남기는 표본 상한. */
    static final int SAMPLE_LIMIT = 256;
    /** 코드 분포의 종류 상한. 넘으면 분포를 세지 않는다. */
    static final int CODE_DISTINCT_LIMIT = 1000;

    private static final ReconciliationRun NONE = new ReconciliationRun(ReconciliationPlan.none(), null, null);

    private final ReconciliationPlan plan;
    private final ColumnReplay replay;
    private final TargetReconciliationQueries queries;
    private final Map<String, AggregateGroup> groups = new LinkedHashMap<>();
    private final Map<String, SourceAggregates> sources = new HashMap<>();
    private final Map<String, MappingTally> tallies = new LinkedHashMap<>();
    private Boolean replicationRoleOrigin;

    private ReconciliationRun(ReconciliationPlan plan, ColumnReplay replay, TargetReconciliationQueries queries) {
        this.plan = plan;
        this.replay = replay;
        this.queries = queries;
        if (plan.active()) {
            Map<String, List<MappingPlan>> grouped = new LinkedHashMap<>();
            for (MappingPlan mapping : plan.mappings()) {
                grouped.computeIfAbsent(mapping.aggregateGroup(), ignored -> new ArrayList<>()).add(mapping);
                tallies.put(key(mapping.label()), new MappingTally(this, mapping));
            }
            grouped.forEach((group, mappings) -> {
                List<AggregateColumn> columns = new ArrayList<>();
                for (MappingPlan mapping : mappings) {
                    for (ColumnCheck column : mapping.columns()) {
                        AggregateColumn aggregate = AggregateColumn.of(column);
                        if (aggregate != null) {
                            columns.add(aggregate);
                        }
                    }
                }
                MappingPlan first = mappings.getFirst();
                groups.put(group, new AggregateGroup(group, first.source(), first.where(),
                        SourceAggregateQuery.of(first.source(), first.where(), columns),
                        mappings.stream().map(MappingPlan::label).toList()));
            });
        }
    }

    /** 대사를 하지 않는 실행 — 실행기·verifier 가 종전과 같다. */
    public static ReconciliationRun none() {
        return NONE;
    }

    /** {@code queries} 는 dry-run 에서 null 이다(대상 쪽 검사를 하지 않는다). */
    public static ReconciliationRun of(ReconciliationPlan plan, ColumnReplay replay,
                                       TargetReconciliationQueries queries) {
        Objects.requireNonNull(plan, "plan");
        if (!plan.active()) {
            return NONE;
        }
        return new ReconciliationRun(plan, Objects.requireNonNull(replay, "replay"), queries);
    }

    public boolean active() {
        return plan.active();
    }

    public ReconciliationPlan plan() {
        return plan;
    }

    public ColumnReplay replay() {
        return replay;
    }

    public TargetReconciliationQueries queries() {
        return queries;
    }

    /** 원천 집계 묶음. 실행기가 묶음마다 집계 문장을 한 번 보낸다. */
    public Collection<AggregateGroup> aggregateGroups() {
        return Collections.unmodifiableCollection(groups.values());
    }

    public void recordSource(String group, SourceAggregates aggregates) {
        if (active()) {
            sources.put(group, Objects.requireNonNull(aggregates, "aggregates"));
        }
    }

    /** 묶음의 원천 집계. 재지 않았으면 null. */
    public SourceAggregates source(String group) {
        return sources.get(group);
    }

    /** 대상 쓰기 연결의 {@code session_replication_role} 이 origin 이었는가. 한 번이라도 아니면 아니다. */
    public void replicationRole(boolean origin) {
        if (active()) {
            replicationRoleOrigin = replicationRoleOrigin == null ? origin : replicationRoleOrigin && origin;
        }
    }

    /** 검사하지 않았으면 null. */
    public Boolean replicationRoleOrigin() {
        return replicationRoleOrigin;
    }

    /** 매핑의 실행기 쪽 수집. 비활성이거나 계획에 없는 라벨이면 아무 일도 하지 않는 수집이다. */
    public MappingTally table(String label) {
        MappingTally tally = tallies.get(key(label));
        return tally == null ? MappingTally.NOOP : tally;
    }

    /** verify 패스의 대상 누적. 매핑마다 새로 만든다 — 같은 실행을 다시 검증해도 겹쳐 세지 않는다. */
    public TargetTally targetTally(String label) {
        MappingPlan mapping = plan.mapping(label);
        if (mapping == null) {
            throw new IllegalArgumentException("reconciliation plan has no mapping");
        }
        return new TargetTally(mapping, replay, table(label).samples());
    }

    @Override
    public String toString() {
        return "ReconciliationRun[" + (active() ? "active" : "none") + "]";
    }

    private static String key(String label) {
        return label == null ? "" : label.toLowerCase(Locale.ROOT);
    }

    /** 원천 집계 묶음 — 키·소스·where·문장과 그 묶음을 쓰는 매핑 라벨. */
    public record AggregateGroup(String key, String source, String where, SourceAggregateQuery query,
                                 List<String> labels) {

        @Override
        public String toString() {
            return "AggregateGroup" + labels;
        }
    }

    /** 실행기가 codemap 을 한 번 적용한 결과. */
    public record CodeHit(String targetColumn, String codemap, Translation translation) {}

    /**
     * 매핑 하나의 실행기 쪽 수집 — codemap 결과 분포·종류·맞은 키 위치, 격리 행의 NULL 아닌 수·합·대상 PK, 표본 원값.
     * 실패 없이 변환한 행만 센다(격리 행은 {@link #isolated} 로 따로 센다).
     */
    public static final class MappingTally {

        static final MappingTally NOOP = new MappingTally(null, null);

        private final ReconciliationRun run;
        private final MappingPlan plan;
        private final Map<String, CodeTally> codes = new HashMap<>();
        private final Map<String, Long> isolatedNonNull = new HashMap<>();
        private final Map<String, BigDecimal> isolatedSums = new HashMap<>();
        private final Set<String> isolatedSumUnknown = new HashSet<>();
        private final List<List<Object>> isolatedKeys = new ArrayList<>();
        private final Map<String, Map<String, Object>> samples = new LinkedHashMap<>();
        private long isolatedRows;
        private boolean keyUnknown;

        private MappingTally(ReconciliationRun run, MappingPlan plan) {
            this.run = run;
            this.plan = plan;
        }

        private boolean noop() {
            return plan == null;
        }

        /** 한 행의 codemap 결과. 실패 없이 변환한 행에서만 부른다(쓰기 재시도의 재변환은 부르지 않는다). */
        public void codes(List<CodeHit> hits) {
            if (noop() || hits == null) {
                return;
            }
            for (CodeHit hit : hits) {
                String column = key(hit.targetColumn());
                CodeTally tally = codes.computeIfAbsent(column, ignored -> new CodeTally(
                        run.replay == null ? List.of() : run.replay.codemapKeys(hit.codemap())));
                tally.add(hit.translation());
            }
        }

        /**
         * 적재한 행(재개로 건너뛴 행 포함) 하나. 원천 행 수로 정한 등간격으로 {@link ReconciliationRun#SAMPLE_LIMIT} 행까지
         * 표본 컬럼의 원값을 대상 키와 함께 둔다. 원천 집계가 없으면 표본을 두지 않는다.
         */
        public void accepted(long ordinal, Map<String, Object> source, String targetKey) {
            if (noop() || targetKey == null || source == null || samples.size() >= SAMPLE_LIMIT
                    || !plan.hasSampledColumns()) {
                return;
            }
            SourceAggregates aggregates = run.source(plan.aggregateGroup());
            if (aggregates == null) {
                return;
            }
            long stride = Math.max(1L, (aggregates.rows() + SAMPLE_LIMIT - 1) / SAMPLE_LIMIT);
            if (ordinal % stride != 0) {
                return;
            }
            Map<String, Object> values = new HashMap<>();
            for (ColumnCheck column : plan.columns()) {
                if (column.sampled() && column.sourceColumn() != null) {
                    values.put(key(column.targetColumn()), source.get(column.sourceColumn()));
                }
            }
            samples.put(targetKey, values);
        }

        /** 승인 위반으로 격리한 행 하나. {@code out} 은 그 행의 변환 결과(대상 PK 를 꺼낸다)다. */
        public void isolated(Map<String, Object> source, Map<String, Object> out) {
            if (noop()) {
                return;
            }
            isolatedRows++;
            for (ColumnCheck column : plan.columns()) {
                if (column.sourceColumn() == null) {
                    continue;
                }
                Object value = source == null ? null : source.get(column.sourceColumn());
                String target = key(column.targetColumn());
                if (column.nonNull() && value != null) {
                    isolatedNonNull.merge(target, 1L, Long::sum);
                }
                if (column.aggregate() == Aggregate.NUM && value != null) {
                    BigDecimal decimal = ReconciliationValues.decimal(value);
                    if (decimal == null) {
                        isolatedSumUnknown.add(target);
                    } else {
                        isolatedSums.merge(target, decimal, BigDecimal::add);
                    }
                }
            }
            List<Object> key = new ArrayList<>(plan.targetPrimaryKey().size());
            for (String column : plan.targetPrimaryKey()) {
                Object value = out == null ? null : valueIgnoreCase(out, column);
                if (value == null) {
                    keyUnknown = true;
                    return;
                }
                key.add(value);
            }
            if (key.isEmpty()) {
                keyUnknown = true;
                return;
            }
            isolatedKeys.add(Collections.unmodifiableList(key));
        }

        public long isolatedRows() {
            return isolatedRows;
        }

        public long isolatedNonNull(String column) {
            return isolatedNonNull.getOrDefault(key(column), 0L);
        }

        /** 격리 행의 합. 합할 수 없는 값이 있었으면 null. */
        public BigDecimal isolatedSum(String column) {
            String key = key(column);
            return isolatedSumUnknown.contains(key) ? null : isolatedSums.getOrDefault(key, BigDecimal.ZERO);
        }

        /** 격리 행의 대상 PK 튜플(키 순서). */
        public List<List<Object>> isolatedKeys() {
            return Collections.unmodifiableList(isolatedKeys);
        }

        /** 격리 행 가운데 대상 PK 를 알 수 없는 행이 있었는가. */
        public boolean keyUnknown() {
            return keyUnknown;
        }

        /** 표본: 대상 키 → (대상 컬럼 → 원값). */
        Map<String, Map<String, Object>> samples() {
            return Collections.unmodifiableMap(samples);
        }

        /** codemap 결과 분포(정규형 → 행 수, NULL 제외). 세지 않았으면 빈 맵이다. */
        public Map<String, Long> codeDistribution(String column) {
            CodeTally tally = codes.get(key(column));
            return tally == null ? Map.of() : Collections.unmodifiableMap(tally.distribution);
        }

        public boolean codeOverflow(String column) {
            CodeTally tally = codes.get(key(column));
            return tally != null && tally.overflow;
        }

        /** 결과 종류별 행 수. */
        public Map<Translation.Kind, Long> codeKinds(String column) {
            CodeTally tally = codes.get(key(column));
            return tally == null ? Map.of() : Collections.unmodifiableMap(tally.kinds);
        }

        /** {@code nullAs: fallback} 으로 NULL 이 대체값이 된 행 수. */
        public long nullFallbacks(String column) {
            return codeKinds(column).getOrDefault(Translation.Kind.NULL_FALLBACK, 0L);
        }

        /** codemap {@code values} 에서 한 번도 맞지 않은 키의 위치(1부터, 정렬). 세지 않았으면 빈 목록이다. */
        public List<Integer> unusedKeyPositions(String column) {
            CodeTally tally = codes.get(key(column));
            if (tally == null) {
                return List.of();
            }
            List<Integer> unused = new ArrayList<>();
            for (int position = 1; position <= tally.keys.size(); position++) {
                if (!tally.matched.contains(position)) {
                    unused.add(position);
                }
            }
            return unused;
        }

        @Override
        public String toString() {
            return "MappingTally";
        }

        private static Object valueIgnoreCase(Map<String, Object> row, String column) {
            Object exact = row.get(column);
            if (exact != null) {
                return exact;
            }
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                if (entry.getKey() != null && entry.getKey().equalsIgnoreCase(column)) {
                    return entry.getValue();
                }
            }
            return null;
        }
    }

    /** 컬럼 하나의 codemap 결과 집계. */
    private static final class CodeTally {
        private final List<String> keys;
        private final Map<String, Integer> positions = new HashMap<>();
        private final Map<String, Long> distribution = new HashMap<>();
        private final Map<Translation.Kind, Long> kinds = new EnumMap<>(Translation.Kind.class);
        private final Set<Integer> matched = new TreeSet<>();
        private boolean overflow;

        private CodeTally(List<String> keys) {
            this.keys = keys;
            for (int i = 0; i < keys.size(); i++) {
                positions.putIfAbsent(keys.get(i), i + 1);
            }
        }

        private void add(Translation translation) {
            kinds.merge(translation.kind(), 1L, Long::sum);
            if (translation.matchedKey() != null) {
                Integer position = positions.get(translation.matchedKey());
                if (position != null) {
                    matched.add(position);
                }
            }
            if (translation.value() == null || overflow) {
                return;
            }
            String code = ReconciliationValues.canonical(translation.value());
            if (!distribution.containsKey(code) && distribution.size() >= CODE_DISTINCT_LIMIT) {
                overflow = true;
                distribution.clear();
                return;
            }
            distribution.merge(code, 1L, Long::sum);
        }
    }
}
