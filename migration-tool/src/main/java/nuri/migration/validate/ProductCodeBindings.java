package nuri.migration.validate;

import nuri.migration.validate.ledger.TermLedgerValidator;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * [ADR-0029 L4 D7] 제품 Java 가 업무 컬럼을 공통코드 그룹에 묶는 곳의 카탈로그. 정본은 온라인 앱 코드이고, 운영 계약
 * ({@code scripts/reusable-reference-data.test.mjs})이 생산 Java 의 그룹 리터럴과 양방향으로 대조한다 — 앱이 새 그룹을 읽으면
 * 이 표를 고쳐야 계약이 통과한다.
 *
 * <p>{@link Use#VALIDATE} 는 앱이 쓰기 때 사용 중 상세코드만 받는 컬럼이다(결재 상신·재상신의 업무 구분). 이관도 같은 규칙을
 * 지나야 하므로 쓰기 전 게이트({@link CodeSetPrecheck})와 적재 뒤 대사가 어긋나면 load 가 실패한다. {@link Use#DISPLAY} 는 앱이
 * 이름을 붙여 보이기만 하는 컬럼이라 대사가 건수만 남긴다. {@code trim} 은 앱이 공백을 지우고 조인하는 컬럼이다.</p>
 */
public final class ProductCodeBindings {

    /** 앱이 그 그룹으로 하는 일. */
    public enum Use { VALIDATE, DISPLAY }

    /** 바인딩 한 행. {@code table} 은 schema 없는 대상 표 이름이다. */
    public record Binding(String table, String column, String group, Use use, boolean trim) {

        public Binding {
            if (blank(table) || blank(column) || blank(group) || use == null) {
                throw new IllegalArgumentException("binding needs table, column, group and use");
            }
        }
    }

    // 운영 계약이 이 줄 모양을 읽는다 — 한 줄에 하나, 이 순서·리터럴 그대로 둔다.
    // 결재 본표만 VALIDATE 다: 임시저장은 다시 상신할 때 검증하고, 이력은 이름만 보인다.
    public static final List<Binding> ALL = List.of(
            new Binding("tb_ifml_atrz_info", "task_se_cd", "COM075", Use.VALIDATE, false),
            new Binding("tb_ifml_atrz_tmpr_strg", "task_se_cd", "COM075", Use.DISPLAY, false),
            new Binding("tb_ifml_atrz_hstry", "task_se_cd", "COM075", Use.DISPLAY, false),
            new Binding("tb_bbs_master", "bbs_type_cd", "COM004", Use.DISPLAY, false),
            new Binding("tb_bbs_master", "bbs_atrb_cd", "COM009", Use.DISPLAY, false),
            new Binding("tb_sys_log", "prcs_se_cd", "COM033", Use.DISPLAY, true));

    private ProductCodeBindings() {
    }

    /** {@link #ALL} 에서 대상 표·컬럼의 바인딩을 찾는다. */
    public static List<Binding> of(String target, String column) {
        return of(ALL, target, column);
    }

    /**
     * 대상 표({@code schema.table} 또는 {@code table})·컬럼의 바인딩. 표 이름은 schema 를 떼고, 표·컬럼 모두 대소문자를 가리지
     * 않는다. 없으면 빈 목록이다.
     */
    public static List<Binding> of(List<Binding> bindings, String target, String column) {
        Objects.requireNonNull(bindings, "bindings");
        if (blank(target) || blank(column)) {
            return List.of();
        }
        String table = tableName(target);
        List<Binding> found = new ArrayList<>();
        for (Binding binding : bindings) {
            if (binding.table().equalsIgnoreCase(table) && binding.column().equalsIgnoreCase(column.trim())) {
                found.add(binding);
            }
        }
        return found;
    }

    /** {@code schema.table} 의 표 이름 부분(소문자). schema 가 없으면 그대로다. */
    static String tableName(String target) {
        String trimmed = target.trim();
        return trimmed.substring(trimmed.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
    }

    /** {@code schema.table} 의 schema 부분(소문자). 없으면 {@code defaultSchema}(소문자)다. */
    static String schemaName(String target, String defaultSchema) {
        String trimmed = target.trim();
        String schema = trimmed.substring(0, Math.max(trimmed.lastIndexOf('.'), 0));
        if (schema.isBlank()) {
            schema = defaultSchema;
        }
        return (blank(schema) ? TermLedgerValidator.DEFAULT_SCHEMA : schema.trim()).toLowerCase(Locale.ROOT);
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
