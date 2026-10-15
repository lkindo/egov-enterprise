package nuri.migration.verify;

import nuri.migration.source.SourceIntrospector;
import nuri.migration.transform.CodeTranslator.Translation;
import nuri.migration.validate.CodeSetTarget;
import nuri.migration.validate.CodeSetTarget.Source;
import nuri.migration.validate.ProductCodeBindings.Use;
import nuri.migration.validate.ledger.TermLedgerValidator;
import nuri.migration.verify.ReconciliationEvidence.CodemapUseRecord;
import nuri.migration.verify.ReconciliationPlan.MappingPlan;
import nuri.migration.verify.ReconciliationRun.MappingTally;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;

/**
 * [ADR-0029 L4 D7] 적재 뒤 공통코드·허용값 대사. 대상 컬럼 <b>전체</b>(이전 run·직접 적재한 행 포함 — INSERT 전용이라 컷오버
 * 상태에 다 들어간다)를 대상 DB 안에서 센다. 대상 표마다 문장 하나({@code FILTER} 집계)를 보내고 그룹 id·허용값은 바인딩만
 * 한다. 값은 JVM 으로 오지 않고 건수만 온다.
 *
 * <p>판정(사용자 결정 L4-P2, DEC-OPS-325): 쓰기 검증 바인딩은 그룹에 없거나 사용 중이 아닌 코드가 있으면 FAIL, 표시 바인딩은
 * 건수만 기록, 메타 허용값은 밖의 코드가 있으면 FAIL, 대조할 원천이 없는 코드 컬럼은 {@code UNRECONCILED} 로 남겨 컷오버
 * 전에 업무 소유자가 확인·서명한다. 질의가 실패하면 실패 원천은 FAIL, 나머지는 사유를 붙여 기록만 한다.</p>
 *
 * <p>codemap 사용 집계({@link #codemapUse})는 실행기가 실패 없이 변환한 행의 codemap 결과 종류와 한 번도 맞지 않은 키 위치를
 * (대상, 컬럼, codemap)마다 합친다.</p>
 */
public final class CodeSetReconciler {

    /** 쓰기 검증 바인딩 컬럼에 그룹의 상세코드가 아닌 값이 있다. */
    public static final String CODE_MISSING = "CODE_MISSING";
    /** 쓰기 검증 바인딩 컬럼에 사용 중이 아닌 상세코드가 있다. */
    public static final String CODE_INACTIVE = "CODE_INACTIVE";
    /** 메타 허용값 밖의 코드가 있다. */
    public static final String CODE_OUTSIDE_ALLOWED = "CODE_OUTSIDE_ALLOWED";
    /** 대사 질의가 실패했다. SQLSTATE 만 붙인다. */
    public static final String CODE_SET_QUERY_FAILED = "CODE_SET_QUERY_FAILED";

    private static final String DETAIL_TABLE = "tb_com_dtl_cd";

    private CodeSetReconciler() {
    }

    /** 판정 상태. {@link #RECORDED}·{@link #UNRECONCILED} 는 load 를 실패시키지 않는 보고 상태다. */
    public enum Status { PASS, FAIL, RECORDED, UNRECONCILED }

    /** 대상 표 하나의 대사 문장. {@code targets} 는 이 문장이 세는 대상의 순번이다. 인자(허용값)는 {@code toString} 에 내지 않는다. */
    public record TableQuery(String table, String sql, List<Object> args, List<Integer> targets) {

        public TableQuery {
            args = List.copyOf(args);
            targets = List.copyOf(targets);
        }

        @Override
        public String toString() {
            return "TableQuery[" + table + ", targets=" + targets.size() + "]";
        }
    }

    /**
     * 대상 하나의 판정. 건수는 센 것만 있고 나머지는 null 이다.
     *
     * @param nonNull         NULL 아닌 행 수
     * @param missing         그룹의 상세코드가 아닌 행 수(COMMON_CODE)
     * @param missingDistinct 그룹의 상세코드가 아닌 값의 종류 수(COMMON_CODE)
     * @param inactive        사용 중이 아닌 상세코드 행 수(COMMON_CODE)
     * @param outside         허용값 밖 행 수(ALLOWED_VALUES)
     * @param distinct        값의 종류 수(UNRECONCILED)
     * @param reason          사유 코드. 질의 실패면 SQLSTATE 를 붙인다
     */
    public record CodeSetVerdict(CodeSetTarget target, Status status, Long nonNull, Long missing, Long missingDistinct,
                                 Long inactive, Long outside, Long distinct, String reason) {

        public boolean failed() {
            return status == Status.FAIL;
        }
    }

    /** 대상 표마다 문장 하나를 만든다(표는 처음 나온 순서). 대상이 없으면 빈 목록이다. */
    public static List<TableQuery> queries(List<CodeSetTarget> targets) {
        Objects.requireNonNull(targets, "targets");
        Map<String, List<Integer>> byTable = new LinkedHashMap<>();
        for (int index = 0; index < targets.size(); index++) {
            byTable.computeIfAbsent(targets.get(index).table(), ignored -> new ArrayList<>()).add(index);
        }
        List<TableQuery> queries = new ArrayList<>();
        for (Map.Entry<String, List<Integer>> table : byTable.entrySet()) {
            List<String> select = new ArrayList<>();
            List<Object> args = new ArrayList<>();
            for (int index : table.getValue()) {
                CodeSetTarget target = targets.get(index);
                String column = SourceIntrospector.ident(target.column());
                String value = target.trim() ? "trim(" + column + ")" : column;
                select.add("count(" + value + ") AS nn_" + index);
                switch (target.source()) {
                    case COMMON_CODE -> {
                        String detail = SourceIntrospector.qualifiedIdent(schema(target.table()) + "." + DETAIL_TABLE);
                        String absent = "NOT EXISTS (SELECT 1 FROM " + detail + " d WHERE d.cd_id = ? AND d.dtl_cd = "
                                + value + ")";
                        select.add("count(*) FILTER (WHERE " + value + " IS NOT NULL AND " + absent + ") AS missing_"
                                + index);
                        select.add("count(DISTINCT " + value + ") FILTER (WHERE " + absent + ") AS missing_distinct_"
                                + index);
                        select.add("count(*) FILTER (WHERE " + value + " IS NOT NULL AND EXISTS (SELECT 1 FROM "
                                + detail + " d WHERE d.cd_id = ? AND d.dtl_cd = " + value
                                + " AND d.use_yn IS DISTINCT FROM 'Y')) AS inactive_" + index);
                        args.add(target.group());
                        args.add(target.group());
                        args.add(target.group());
                    }
                    case ALLOWED_VALUES -> {
                        select.add("count(*) FILTER (WHERE " + value + " IS NOT NULL AND NOT (" + value
                                + " = ANY (?))) AS outside_" + index);
                        args.add(List.copyOf(target.allowed()));
                    }
                    case UNRECONCILED -> select.add("count(DISTINCT " + value + ") AS distinct_" + index);
                }
            }
            queries.add(new TableQuery(table.getKey(), "SELECT " + String.join(", ", select) + " FROM "
                    + SourceIntrospector.qualifiedIdent(table.getKey()), args, table.getValue()));
        }
        return queries;
    }

    /** 표마다 문장을 보내고 판정한다. 질의 실패는 그 표의 대상마다 사유로 남는다. */
    public static List<CodeSetVerdict> reconcile(List<CodeSetTarget> targets, TargetReconciliationQueries queries) {
        Objects.requireNonNull(queries, "queries");
        Map<String, Long> counts = new HashMap<>();
        Map<Integer, String> failures = new HashMap<>();
        for (TableQuery query : queries(targets)) {
            try {
                counts.putAll(queries.counts(query.sql(), query.args()));
            } catch (ReconciliationQueryException failure) {
                for (int index : query.targets()) {
                    failures.put(index, failure.sqlState() == null ? "unknown" : failure.sqlState());
                }
            }
        }
        return judge(targets, counts, failures);
    }

    /**
     * 판정한다. {@code counts} 는 문장의 열 별칭 → 건수(모든 표), {@code failures} 는 대상 순번 → SQLSTATE 다. 질의는 성공했는데
     * 건수가 없으면 질의 실패로 본다.
     */
    public static List<CodeSetVerdict> judge(List<CodeSetTarget> targets, Map<String, Long> counts,
                                             Map<Integer, String> failures) {
        Objects.requireNonNull(targets, "targets");
        Objects.requireNonNull(counts, "counts");
        Objects.requireNonNull(failures, "failures");
        List<CodeSetVerdict> verdicts = new ArrayList<>();
        for (int index = 0; index < targets.size(); index++) {
            CodeSetTarget target = targets.get(index);
            String failure = failures.get(index);
            Long nonNull = counts.get("nn_" + index);
            if (failure == null && nonNull == null) {
                failure = "unknown";
            }
            if (failure != null) {
                verdicts.add(failed(target, failure));
                continue;
            }
            verdicts.add(switch (target.source()) {
                case COMMON_CODE -> commonCode(target, index, nonNull, counts);
                case ALLOWED_VALUES -> allowedValues(target, index, nonNull, counts);
                case UNRECONCILED -> {
                    Long distinct = counts.get("distinct_" + index);
                    yield distinct == null ? failed(target, "unknown")
                            : new CodeSetVerdict(target, Status.UNRECONCILED, nonNull, null, null, null, null, distinct,
                            null);
                }
            });
        }
        return verdicts;
    }

    /**
     * 실패 판정의 보고 문구 — 대상 표·컬럼, 원천, 사유 코드와 건수만 싣는다. 실패가 아니면 null 이다.
     */
    public static String failureNote(CodeSetVerdict verdict) {
        if (verdict == null || !verdict.failed()) {
            return null;
        }
        CodeSetTarget target = verdict.target();
        String source = target.source() + (target.group() == null ? "" : "(" + target.group() + ")");
        Long rows = switch (verdict.reason() == null ? "" : verdict.reason()) {
            case CODE_MISSING -> verdict.missing();
            case CODE_INACTIVE -> verdict.inactive();
            case CODE_OUTSIDE_ALLOWED -> verdict.outside();
            default -> null;
        };
        return "공통코드 대사 불일치(" + target.table() + "." + target.column() + ", source=" + source + "): "
                + verdict.reason() + (rows == null ? "" : " " + rows + "건");
    }

    /**
     * codemap 사용 집계 — 계획의 codemap 컬럼마다 결과 종류(대응·통과·대체·NULL 대체) 행 수와 한 번도 맞지 않은 키 위치.
     * 같은 (대상, 컬럼, codemap)을 여러 매핑이 쓰면 건수를 더하고, 키 위치는 어느 매핑에서도 맞지 않은 것만 남긴다. 한 행도
     * 변환하지 않았으면 모든 키가 맞지 않은 것이다. 비활성 실행이면 빈 목록이다.
     */
    public static List<CodemapUseRecord> codemapUse(ReconciliationRun run) {
        Objects.requireNonNull(run, "run");
        if (!run.active()) {
            return List.of();
        }
        Map<String, CodemapTally> uses = new LinkedHashMap<>();
        for (MappingPlan mapping : run.plan().mappings()) {
            MappingTally tally = run.table(mapping.label());
            for (ColumnCheck column : mapping.columns()) {
                if (column.codemap() == null) {
                    continue;
                }
                String key = (mapping.target() + '\u0000' + column.targetColumn() + '\u0000' + column.codemap())
                        .toLowerCase(Locale.ROOT);
                Map<Translation.Kind, Long> kinds = tally.codeKinds(column.targetColumn());
                List<Integer> unused = kinds.isEmpty() ? allPositions(run, column.codemap())
                        : tally.unusedKeyPositions(column.targetColumn());
                CodemapTally use = uses.computeIfAbsent(key, ignored -> new CodemapTally(mapping.target(),
                        column.targetColumn(), column.codemap(), new TreeSet<>(unused)));
                use.add(kinds, unused);
            }
        }
        return uses.values().stream().map(CodemapTally::record).toList();
    }

    private static CodeSetVerdict commonCode(CodeSetTarget target, int index, Long nonNull, Map<String, Long> counts) {
        Long missing = counts.get("missing_" + index);
        Long missingDistinct = counts.get("missing_distinct_" + index);
        Long inactive = counts.get("inactive_" + index);
        if (missing == null || missingDistinct == null || inactive == null) {
            return failed(target, "unknown");
        }
        if (target.use() != Use.VALIDATE) {
            return new CodeSetVerdict(target, Status.RECORDED, nonNull, missing, missingDistinct, inactive, null, null,
                    null);
        }
        String reason = missing > 0 ? CODE_MISSING : inactive > 0 ? CODE_INACTIVE : null;
        return new CodeSetVerdict(target, reason == null ? Status.PASS : Status.FAIL, nonNull, missing, missingDistinct,
                inactive, null, null, reason);
    }

    private static CodeSetVerdict allowedValues(CodeSetTarget target, int index, Long nonNull,
                                                Map<String, Long> counts) {
        Long outside = counts.get("outside_" + index);
        if (outside == null) {
            return failed(target, "unknown");
        }
        return outside > 0
                ? new CodeSetVerdict(target, Status.FAIL, nonNull, null, null, null, outside, null,
                CODE_OUTSIDE_ALLOWED)
                : new CodeSetVerdict(target, Status.PASS, nonNull, null, null, null, outside, null, null);
    }

    /** 질의 실패. 실패 원천은 FAIL, 표시 바인딩은 기록, 원천 없는 컬럼은 서명 대상 그대로다. */
    private static CodeSetVerdict failed(CodeSetTarget target, String sqlState) {
        String reason = CODE_SET_QUERY_FAILED + "(SQLSTATE=" + sqlState + ")";
        Status status = target.failSource() ? Status.FAIL
                : target.source() == Source.UNRECONCILED ? Status.UNRECONCILED : Status.RECORDED;
        return new CodeSetVerdict(target, status, null, null, null, null, null, null, reason);
    }

    private static List<Integer> allPositions(ReconciliationRun run, String codemap) {
        int size = run.replay() == null ? 0 : run.replay().codemapKeys(codemap).size();
        List<Integer> positions = new ArrayList<>(size);
        for (int position = 1; position <= size; position++) {
            positions.add(position);
        }
        return positions;
    }

    /** 대상 표({@code schema.table})의 schema. */
    private static String schema(String table) {
        int dot = table.lastIndexOf('.');
        return dot > 0 ? table.substring(0, dot) : TermLedgerValidator.DEFAULT_SCHEMA;
    }

    /** (대상, 컬럼, codemap) 하나의 누적. */
    private static final class CodemapTally {
        private final String target;
        private final String column;
        private final String codemap;
        private final TreeSet<Integer> unused;
        private long mapped;
        private long passthrough;
        private long fallback;
        private long nullFallback;

        private CodemapTally(String target, String column, String codemap, TreeSet<Integer> unused) {
            this.target = target;
            this.column = column;
            this.codemap = codemap;
            this.unused = unused;
        }

        private void add(Map<Translation.Kind, Long> kinds, List<Integer> notMatched) {
            mapped += kinds.getOrDefault(Translation.Kind.MAPPED, 0L);
            passthrough += kinds.getOrDefault(Translation.Kind.PASSTHROUGH, 0L);
            fallback += kinds.getOrDefault(Translation.Kind.FALLBACK, 0L);
            nullFallback += kinds.getOrDefault(Translation.Kind.NULL_FALLBACK, 0L);
            unused.retainAll(notMatched);
        }

        private CodemapUseRecord record() {
            return new CodemapUseRecord(target, column, codemap, mapped, passthrough, fallback, nullFallback,
                    List.copyOf(unused));
        }
    }
}
