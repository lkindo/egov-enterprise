package nuri.migration.validate;

import nuri.migration.validate.ProductCodeBindings.Use;

import java.util.Collections;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;

/**
 * [ADR-0029 L4 D7] 공통코드·허용값 대사 대상 한 컬럼. D2 의 대사 계획({@code ReconciliationPlan})이 목록으로 들고 다니고,
 * 적재 뒤 대사({@code CodeSetReconciler})가 대상 컬럼 전체를 DB 안에서 센다.
 *
 * <p>원천은 셋이다. {@link Source#COMMON_CODE} 는 제품 바인딩({@link ProductCodeBindings})의 그룹, {@link Source#ALLOWED_VALUES}
 * 는 읽을 수 있는 메타 허용값, {@link Source#UNRECONCILED} 는 대조할 원천이 없는 코드 컬럼이다(L4-P2, DEC-OPS-325 — 컷오버
 * 전에 업무 소유자가 확인·서명한다). 허용값 집합은 메모리에만 두고 {@code toString} 으로 내지 않는다.</p>
 *
 * @param table       대상 표({@code schema.table}, 소문자)
 * @param column      대상 컬럼(소문자)
 * @param group       COMMON_CODE 의 그룹 id. 아니면 null 이다
 * @param use         COMMON_CODE 의 쓰임. 아니면 null 이다
 * @param trim        앱이 공백을 지우고 조인하는 바인딩인가
 * @param allowed     ALLOWED_VALUES 의 허용 코드. 아니면 빈 집합이다
 * @param ledgerEntry ALLOWED_VALUES·UNRECONCILED 의 원장 행 id. COMMON_CODE 는 null 이다
 * @param deferred    쓰기 전 게이트가 판정을 미뤘는가(mapping 이 공통코드 표를 함께 적재한다)
 * @param groupAbsent 쓰기 전 게이트가 본 그룹 헤더가 대상에 없었는가(DISPLAY)
 */
public record CodeSetTarget(String table, String column, Source source, String group, Use use, boolean trim,
                            Set<String> allowed, String ledgerEntry, boolean deferred, boolean groupAbsent) {

    /** 대조 원천. */
    public enum Source { COMMON_CODE, ALLOWED_VALUES, UNRECONCILED }

    public CodeSetTarget {
        if (table == null || table.isBlank() || column == null || column.isBlank()) {
            throw new IllegalArgumentException("code set target needs table and column");
        }
        table = table.trim().toLowerCase(Locale.ROOT);
        column = column.trim().toLowerCase(Locale.ROOT);
        Objects.requireNonNull(source, "source");
        allowed = allowed == null ? Set.of() : Collections.unmodifiableSet(new TreeSet<>(allowed));
        switch (source) {
            case COMMON_CODE -> {
                if (group == null || group.isBlank() || use == null) {
                    throw new IllegalArgumentException("common code target needs group and use");
                }
            }
            case ALLOWED_VALUES -> {
                if (allowed.isEmpty() || ledgerEntry == null) {
                    throw new IllegalArgumentException("allowed values target needs codes and a ledger entry");
                }
            }
            case UNRECONCILED -> {
                if (ledgerEntry == null) {
                    throw new IllegalArgumentException("unreconciled target needs a ledger entry");
                }
            }
        }
    }

    /** 공통코드 바인딩 대상. */
    public static CodeSetTarget commonCode(String table, String column, ProductCodeBindings.Binding binding,
                                           boolean deferred, boolean groupAbsent) {
        return new CodeSetTarget(table, column, Source.COMMON_CODE, binding.group(), binding.use(), binding.trim(),
                Set.of(), null, deferred, groupAbsent);
    }

    /** 메타 허용값 대상. */
    public static CodeSetTarget allowedValues(String table, String column, Set<String> allowed, String ledgerEntry) {
        return new CodeSetTarget(table, column, Source.ALLOWED_VALUES, null, null, false, allowed, ledgerEntry, false,
                false);
    }

    /** 대조할 원천이 없는 코드 컬럼. */
    public static CodeSetTarget unreconciled(String table, String column, String ledgerEntry) {
        return new CodeSetTarget(table, column, Source.UNRECONCILED, null, null, false, Set.of(), ledgerEntry, false,
                false);
    }

    /** 이 대상이 load 를 실패시킬 수 있는 원천인가 — 쓰기 검증 바인딩과 메타 허용값(L4-P2). */
    public boolean failSource() {
        return source == Source.ALLOWED_VALUES || (source == Source.COMMON_CODE && use == Use.VALIDATE);
    }

    @Override
    public String toString() {
        return "CodeSetTarget[" + table + "." + column + ", " + source + (group == null ? "" : ", " + group) + "]";
    }
}
